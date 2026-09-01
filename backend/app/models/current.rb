class Current < ActiveSupport::CurrentAttributes
  attribute :user, :company, :property, :request_id, :ip_address
end
