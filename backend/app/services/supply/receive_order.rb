module Supply
  class ReceiveOrder
    include Support
    def self.call(order:, params:)
      new.call(order, params)
    end
    def call(order, params)
      property = order.property
      BusinessDays::Context.with(property) do
        order.lock!
        retry_key = key(params)
        request_digest = digest(params, %w[storeId deliveryReference items notes])
        if (existing = order.purchase_receipts.find_by(idempotency_key: retry_key))
          invalid!("This identifier was used for a different receipt", status: :conflict) unless existing.request_digest == request_digest
          return existing
        end
        Ledger.new(property).ready!
        invalid!("Approve the order before receiving goods", status: :conflict) unless order.status.in?(%w[APPROVED PARTIALLY_RECEIVED])
        store = property.stores.find(params.require(:storeId))
        reference = params.require(:deliveryReference).to_s.strip
        invalid!("This delivery has already been received", status: :conflict) if order.purchase_receipts.exists?(delivery_reference: reference)
        requested = params.require(:items)
        invalid!("Enter the quantities actually received") unless requested.is_a?(Array) && requested.size.between?(1, 100)
        ids = requested.map { |line| line[:lineId] }
        invalid!("Select each order line once") unless ids.uniq.size == ids.size
        lines = order.purchase_order_items.includes(:inventory_item).index_by(&:id)
        deliveries = requested.map do |line|
          ordered = lines[line[:lineId]]
          invalid!("Select lines from this purchase order") unless ordered && ordered.inventory_item&.company_id == property.company_id
          qty = decimal(line[:quantity], positive: true)
          invalid!("Received quantity exceeds the outstanding order quantity", code: "OVER_RECEIPT", status: :conflict) if qty > ordered.quantity - ordered.received_quantity
          [ordered, qty]
        end
        receipt = order.purchase_receipts.create!(store:, user: Current.user, receipt_number: number(property, "GOODS_RECEIPT"), delivery_reference: reference,
          idempotency_key: retry_key, request_digest:, business_date: property.operating_date, notes: params[:notes])
        deliveries.each do |line, quantity|
          prior_cost = StockMovement.where(purchase_order_item: line, kind: "RECEIPT").sum(:total_cost)
          cost = decimal(((line.received_quantity + quantity) * line.unit_price).round(2) - prior_cost)
          stock = balance(line.inventory_item, store)
          stock.update!(quantity_on_hand: decimal(stock.quantity_on_hand + quantity), inventory_value: decimal(stock.inventory_value + cost))
          line.update!(received_quantity: line.received_quantity + quantity)
          receipt.stock_movements.create!(property:, inventory_item: line.inventory_item, purchase_order_item: line, destination_store: store, user: Current.user,
            kind: "RECEIPT", quantity:, unit_cost: line.unit_price, total_cost: cost, document_number: number(property, "STOCK_MOVEMENT"),
            idempotency_key: "#{receipt.id}:#{line.id}", request_digest:, business_date: property.operating_date, notes: params[:notes])
        end
        complete = order.purchase_order_items.all? { |line| line.received_quantity == line.quantity }
        order.update!(status: complete ? "RECEIVED" : "PARTIALLY_RECEIVED")
        Ledger.new(property).receipt(receipt)
        audit(property, "RECEIVE_ORDER", receipt, { number: receipt.receipt_number, order_id: order.id, store_id: store.id })
        receipt
      end
    end
  end
end
