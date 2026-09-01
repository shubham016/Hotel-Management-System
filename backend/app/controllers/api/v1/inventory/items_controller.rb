module Api
  module V1
    module Inventory
      class ItemsController < BackendController
        def index
          property = default_property
          items = property.company.inventory_items.includes(stock_balances: :store).order(:name)
          render json: { success: true, items: items.map { |item| serialize(item) }, stores: property.stores.as_json }
        end

        def create
          item = default_property.company.inventory_items.find(params.require(:itemId))
          qty = BigDecimal(params.require(:quantity).to_s)
          balance = item.stock_balances.first
          balance&.update!(quantity_on_hand: balance.quantity_on_hand - qty)
          audit!("INVENTORY", "UPDATE", "InventoryItem", item.id, new_values: { issued_quantity: qty.to_s })
          render json: { success: true, message: "Successfully issued #{qty.to_f} #{item.unit_of_measure} of #{item.name} to #{params[:departmentName].presence || 'Main Central Kitchen'}!" }
        end

        private

        def serialize(item)
          total_qty = item.stock_balances.sum(&:quantity_on_hand)
          {
            id: item.id,
            sku: item.item_code,
            name: item.name,
            category: item.category,
            unit: item.unit_of_measure,
            unitPrice: item.standard_cost.to_f,
            currentStock: total_qty.to_f,
            minStock: item.min_reorder_level.to_f,
            reorderPoint: item.min_reorder_level.to_f,
            isLow: total_qty <= item.min_reorder_level,
            totalValuation: (total_qty * item.standard_cost).to_f,
            storesBreakdown: item.stock_balances.map { |stock| { storeName: stock.store.name, qty: stock.quantity_on_hand.to_f } }
          }
        end
      end
    end
  end
end
