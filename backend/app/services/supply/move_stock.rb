module Supply
  class MoveStock
    include Support
    def self.call(property:, params:)
      new.call(property, params)
    end
    def call(property, params)
      BusinessDays::Context.with(property) do
        retry_key = key(params)
        request_digest = digest(params, %w[itemId storeId destinationStoreId quantity department notes operation])
        if (existing = StockMovement.find_by(property:, idempotency_key: retry_key))
          invalid!("This identifier was used for a different stock movement", status: :conflict) unless existing.request_digest == request_digest
          return existing
        end
        Ledger.new(property).ready!
        operation = params[:operation].presence || "ISSUE"
        invalid!("Select Issue or Transfer") unless operation.in?(%w[ISSUE TRANSFER])
        item = property.company.inventory_items.find(params.require(:itemId))
        source = property.stores.find(params.require(:storeId))
        destination = property.stores.find(params.require(:destinationStoreId)) if operation == "TRANSFER"
        invalid!("Select a different destination store") if destination == source
        quantity = decimal(params.require(:quantity), positive: true)
        department = params[:department].to_s.strip
        invalid!("Enter the receiving department") if operation == "ISSUE" && department.blank?
        stock = item.stock_balances.find_by(store: source)
        invalid!("Insufficient stock in the selected store", code: "INSUFFICIENT_STOCK", status: :conflict) unless stock
        stock.lock!
        invalid!("Insufficient stock in the selected store", code: "INSUFFICIENT_STOCK", status: :conflict) if stock.quantity_on_hand < quantity
        invalid!("Review the opening stock value before moving this item", status: :conflict) if stock.inventory_value.negative?
        cost = quantity == stock.quantity_on_hand ? stock.inventory_value : (stock.inventory_value * quantity / stock.quantity_on_hand).round(2)
        stock.update!(quantity_on_hand: stock.quantity_on_hand - quantity, inventory_value: stock.inventory_value - cost)
        if destination
          target = balance(item, destination)
          new_qty, new_value = decimal(target.quantity_on_hand + quantity), decimal(target.inventory_value + cost)
          target.update!(quantity_on_hand: new_qty, inventory_value: new_value)
        end
        movement = StockMovement.create!(property:, inventory_item: item, user: Current.user, source_store: source, destination_store: destination,
          kind: operation, quantity:, unit_cost: (cost / quantity).round(4), total_cost: cost, department: department.presence, notes: params[:notes],
          document_number: number(property, "STOCK_MOVEMENT"), idempotency_key: retry_key, request_digest:, business_date: property.operating_date)
        audit(property, operation, movement, { item_id: item.id, quantity: quantity.to_s, source_store_id: source.id, destination_store_id: destination&.id, department: })
        Ledger.new(property).issue(movement) if operation == "ISSUE"
        movement
      end
    end
  end
end
