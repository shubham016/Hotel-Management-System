require "net/http"
require "openssl"
require "base64"

module Payments
  class Gateway
    def self.available
      {
        ESEWA: ENV["ESEWA_PRODUCT_CODE"].present? && ENV["ESEWA_SECRET_KEY"].present?,
        KHALTI: ENV["KHALTI_SECRET_KEY"].present?
      }
    end

    def self.modes
      available.each_with_object({}) do |(gateway, configured), modes|
        modes[gateway] = ENV["#{gateway}_MODE"] == "live" ? "LIVE" : "SANDBOX" if configured
      end
    end

    def self.frontend_url
      (ENV["FRONTEND_PUBLIC_URL"].presence || ENV.fetch("FRONTEND_ORIGINS", "http://localhost:3000").split(",").first).to_s.delete_suffix("/")
    end

    def self.start(request, gateway)
      raise ApiError.new("This gateway is not configured", status: :unprocessable_content, code: "GATEWAY_UNAVAILABLE") unless available[gateway.to_sym]

      case gateway
      when "ESEWA" then esewa_form(request)
      when "KHALTI" then khalti_link(request)
      end
    end

    def self.verify(request)
      case request.gateway
      when "ESEWA" then verify_esewa(request)
      when "KHALTI" then verify_khalti(request)
      else raise ApiError.new("Payment gateway has not been selected", status: :conflict, code: "PAYMENT_NOT_STARTED")
      end
    end

    def self.esewa_form(request)
      amount = request.amount.to_s("F")
      product_code = ENV.fetch("ESEWA_PRODUCT_CODE")
      reference = request.id
      signed = "total_amount=#{amount},transaction_uuid=#{reference},product_code=#{product_code}"
      signature = Base64.strict_encode64(OpenSSL::HMAC.digest("SHA256", ENV.fetch("ESEWA_SECRET_KEY"), signed))
      base = ENV["ESEWA_MODE"] == "live" ? "https://epay.esewa.com.np" : "https://rc-epay.esewa.com.np"
      return_url = "#{frontend_url}/pay/#{request.public_token}"

      {
        reference:,
        url: "#{base}/api/epay/main/v2/form",
        fields: {
          amount:, tax_amount: "0", total_amount: amount, transaction_uuid: reference,
          product_code:, product_service_charge: "0", product_delivery_charge: "0",
          success_url: "#{return_url}?gateway=ESEWA", failure_url: "#{return_url}?gateway=ESEWA&cancelled=1",
          signed_field_names: "total_amount,transaction_uuid,product_code", signature:
        }
      }
    end

    def self.khalti_link(request)
      base = ENV["KHALTI_MODE"] == "live" ? "https://khalti.com" : "https://dev.khalti.com"
      phone = request.folio.guest.phone.to_s.gsub(/\D/, "").last(10)
      payload = {
        return_url: "#{frontend_url}/pay/#{request.public_token}?gateway=KHALTI",
        website_url: frontend_url,
        amount: (request.amount * 100).to_i,
        purchase_order_id: request.id,
        purchase_order_name: "Hotel New Era #{request.kind.downcase} #{request.folio.folio_number}",
        customer_info: { name: request.folio.guest.full_name, email: request.folio.guest.email, phone: phone&.match?(/\A9\d{9}\z/) ? phone : nil }.compact
      }
      response = post_json("#{base}/api/v2/epayment/initiate/", payload, "Key #{ENV.fetch('KHALTI_SECRET_KEY')}")
      raise ApiError.new("Khalti did not provide a payment link", status: :bad_gateway, code: "GATEWAY_ERROR") if response["pidx"].blank? || response["payment_url"].blank?
      payment_uri = URI(response.fetch("payment_url"))
      raise ApiError.new("Khalti returned an invalid payment link", status: :bad_gateway, code: "GATEWAY_ERROR") unless payment_uri.scheme == "https" && payment_uri.host.to_s.match?(/\A(?:[a-z0-9-]+\.)?khalti\.com\z/)

      { reference: response.fetch("pidx"), url: response.fetch("payment_url") }
    end

    def self.verify_esewa(request)
      base = ENV["ESEWA_MODE"] == "live" ? "https://epay.esewa.com.np" : "https://uat.esewa.com.np"
      query = URI.encode_www_form(product_code: ENV.fetch("ESEWA_PRODUCT_CODE"), total_amount: request.amount.to_s("F"), transaction_uuid: request.gateway_reference)
      response = get_json("#{base}/api/epay/transaction/status/?#{query}")
      amount = BigDecimal((response["total_amount"] || response["totalAmount"] || "0").to_s)
      reference = response["transaction_uuid"] || response["pid"]
      product = response["product_code"] || response["scd"]
      valid = amount == request.amount && response["status"] == "COMPLETE" && (response["ref_id"].present? || response["refId"].present?)
      valid = valid && (reference.blank? || reference == request.gateway_reference) && (product.blank? || product == ENV.fetch("ESEWA_PRODUCT_CODE"))
      { complete: valid, failed: %w[NOT_FOUND CANCELED FULL_REFUND PARTIAL_REFUND].include?(response["status"]), transaction_id: response["ref_id"] || response["refId"] }
    end

    def self.verify_khalti(request)
      base = ENV["KHALTI_MODE"] == "live" ? "https://khalti.com" : "https://dev.khalti.com"
      response = post_json("#{base}/api/v2/epayment/lookup/", { pidx: request.gateway_reference }, "Key #{ENV.fetch('KHALTI_SECRET_KEY')}")
      valid = response["pidx"] == request.gateway_reference && response["total_amount"].to_i == (request.amount * 100).to_i
      { complete: valid && response["status"] == "Completed" && response["refunded"] == false && response["transaction_id"].present?,
        failed: %w[Expired Refunded].include?(response["status"]) || response["status"] == "User canceled",
        transaction_id: response["transaction_id"] }
    end

    def self.post_json(url, payload, authorization)
      uri = URI(url)
      http_request = Net::HTTP::Post.new(uri, "Content-Type" => "application/json", "Authorization" => authorization)
      http_request.body = JSON.generate(payload)
      perform(uri, http_request)
    end

    def self.get_json(url)
      uri = URI(url)
      perform(uri, Net::HTTP::Get.new(uri))
    end

    def self.perform(uri, http_request)
      response = Net::HTTP.start(uri.host, uri.port, use_ssl: true, open_timeout: 5, read_timeout: 10) { |http| http.request(http_request) }
      raise ApiError.new("Payment gateway is temporarily unavailable", status: :bad_gateway, code: "GATEWAY_ERROR") unless response.is_a?(Net::HTTPSuccess)

      JSON.parse(response.body)
    rescue JSON::ParserError, IOError, SocketError, Timeout::Error, OpenSSL::SSL::SSLError
      raise ApiError.new("Payment gateway is temporarily unavailable", status: :bad_gateway, code: "GATEWAY_ERROR")
    end
  end
end
