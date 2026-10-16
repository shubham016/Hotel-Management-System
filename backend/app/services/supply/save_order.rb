module Supply
  class SaveOrder
    include Support
    def self.call(property:, params:, order: nil)
      new.call(property, params, order)
    end
    def call(property, params, order)
      BusinessDays::Context.with(property) do
        retry_key = key(params) unless order
        request_digest = digest(params, %w[supplierId items notes])
        if !order && (existing = property.purchase_orders.find_by(creation_key: retry_key))
          invalid!("This identifier was used for a different order", status: :conflict) unless existing.creation_digest == request_digest
          return existing
        end
        if order
          order.lock!
          version!(order, params)
          invalid!("Only draft orders can be edited", status: :conflict) unless order.status.in?(%w[DRAFT SUBMITTED]) && !order.purchase_receipts.exists?
        end
        supplier = property.company.suppliers.find(params.require(:supplierId))
        requested = params.require(:items)
        invalid!("Add between 1 and 100 purchase items") unless requested.is_a?(Array) && requested.size.between?(1, 100)
        ids = requested.map { |line| line[:itemId] }
        invalid!("Combine duplicate items into one line") unless ids.uniq.size == ids.size
        catalog = property.company.inventory_items.where(id: ids).index_by(&:id)
        lines = requested.map do |line|
          item = catalog[line[:itemId]]
          invalid!("Select items from this company's catalog") unless item
          qty, price = decimal(line[:quantity], positive: true), decimal(line[:unitPrice])
          total = decimal((qty * price).round(2))
          { inventory_item: item, description: item.name, quantity: qty, unit_price: price, line_total: total }
        end
        total = decimal(lines.sum { |line| line[:line_total] })
        order ||= property.purchase_orders.new(company: property.company, po_number: number(property, "PURCHASE_ORDER"), order_date: property.operating_date, creation_key: retry_key, creation_digest: request_digest)
        action = order.new_record? ? "CREATE_ORDER" : "EDIT_ORDER"
        order.assign_attributes(supplier:, status: "DRAFT", sub_total: total, grand_total: total, notes: params[:notes])
        order.save!
        order.purchase_order_items.destroy_all
        lines.each { |line| order.purchase_order_items.create!(line) }
        audit(property, action, order, { number: order.po_number, total: total.to_s })
        order
      end
    end
  end
end
