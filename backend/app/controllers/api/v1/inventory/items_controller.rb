module Api
  module V1
    module Inventory
      class ItemsController < BackendController
        include ::Supply::Support
        def index
          property = default_property
          store = property.stores.find(params[:storeId]) if params[:storeId].present?
          balances = StockBalance.joins(:store).where(stores: { property_id: property.id }).includes(:store).to_a.group_by(&:inventory_item_id)
          items = property.company.inventory_items.order(:name).map do |item|
            stocks = balances[item.id] || []
            stocks = stocks.select { |b| b.store_id == store.id } if store
            qty, value = stocks.sum(&:quantity_on_hand), stocks.sum(&:inventory_value)
            { id: item.id, sku: item.item_code, name: item.name, category: item.category, unit: item.unit_of_measure,
              unitPrice: (qty.positive? ? (value / qty).round(2) : item.standard_cost).to_f, standardCost: item.standard_cost.to_f,
              currentStock: qty.to_f, minStock: item.min_reorder_level.to_f, isLow: qty <= item.min_reorder_level, totalValuation: value.to_f,
              storesBreakdown: stocks.map { |b| { storeId: b.store_id, storeName: b.store.name, qty: b.quantity_on_hand.to_f, value: b.inventory_value.to_f } } }
          end
          movements = StockMovement.where(property:).includes(:inventory_item, :source_store, :destination_store, :user).order(created_at: :desc, id: :desc)
          movements = movements.where("source_store_id = :id OR destination_store_id = :id", id: store.id) if store
          render json: { success: true, openingReviewRequired: property.supply_opening_review_required, openingStockValue: StockBalance.joins(:store).where(stores:{property_id:property.id}).sum(:inventory_value).to_f,
            postedStockValue: ::Supply::Portal.posted_stock_value(property).to_f, items:, stores: property.stores.order(:name).as_json(only: %i[id name code]), movements: movements.limit(100).map { |m| ::Supply::Portal.movement(m) } }
        end

        def reconcile
          posting = ::Supply::Ledger.new(default_property).opening(params)
          render json:{success:true,voucherNumber:posting.journal_entry&.voucher_number}
        end

        def create
          movement = ::Supply::MoveStock.call(property: default_property, params:)
          render json: { success: true, data: ::Supply::Portal.movement(movement) }
        end

        def catalog
          company = default_property.company
          item = company.inventory_items.create!(item_code: params.require(:sku).to_s.strip.upcase, name: params.require(:name).to_s.strip,
            category: params[:category].presence || "GENERAL", unit_of_measure: params.require(:unit).to_s.strip,
            standard_cost: decimal(params[:standardCost] || 0), min_reorder_level: decimal(params[:minStock] || 0))
          audit!("INVENTORY", "CREATE", "InventoryItem", item.id, new_values: { sku: item.item_code })
          render json: { success: true, data: item.as_json }
        end

        def store
          record = default_property.stores.create!(code: params.require(:code).to_s.strip.upcase, name: params.require(:name).to_s.strip)
          audit!("INVENTORY", "CREATE", "Store", record.id, new_values: { code: record.code })
          render json: { success: true, data: record.as_json }
        end
      end
    end
  end
end
