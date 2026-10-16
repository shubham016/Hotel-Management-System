module Supply
  class OrderAction
    include Support
    def self.call(order:, params:, operation:)
      new.call(order, params, operation)
    end
    def call(order, params, operation)
      property = order.property
      BusinessDays::Context.with(property) do
        order.lock!
        version!(order, params)
        case operation
        when "approve"
          invalid!("Received orders cannot be approved again", status: :conflict) if order.purchase_receipts.exists?
          invalid!("Only draft orders can be approved", status: :conflict) unless order.status.in?(%w[DRAFT SUBMITTED])
          lines = order.purchase_order_items.includes(:inventory_item).to_a
          valid = order.supplier&.company_id == property.company_id && lines.any? && lines.all? { |line| line.inventory_item&.company_id == property.company_id && line.quantity.positive? && line.unit_price >= 0 && line.line_total == (line.quantity * line.unit_price).round(2) } && order.grand_total == lines.sum(&:line_total)
          invalid!("Edit this order to supply valid item quantities and prices before approval") unless valid
          order.update!(status: "APPROVED", approved_at: Time.current)
        when "cancel"
          invalid!("This order cannot be cancelled", status: :conflict) unless order.status.in?(%w[DRAFT SUBMITTED APPROVED PARTIALLY_RECEIVED])
          reason = params[:reason].to_s.strip
          invalid!("Enter the cancellation reason") if reason.length < 3
          order.update!(status: order.purchase_receipts.exists? ? "CLOSED" : "CANCELLED", cancelled_at: Time.current, cancellation_reason: reason)
        else
          invalid!("Invalid order action")
        end
        audit(property, operation.upcase, order, { number: order.po_number, status: order.status, reason: params[:reason] })
        order
      end
    end
  end
end
