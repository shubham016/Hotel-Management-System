require "test_helper"
require "net/http"

class PaymentsGatewayTest < ActiveSupport::TestCase
  setup do
    @previous_env = %w[ESEWA_MODE ESEWA_PRODUCT_CODE ESEWA_SECRET_KEY FRONTEND_PUBLIC_URL].to_h { |key| [key, ENV[key]] }
    ENV["ESEWA_MODE"] = "sandbox"
    ENV["ESEWA_PRODUCT_CODE"] = "EPAYTEST"
    ENV["ESEWA_SECRET_KEY"] = "test-secret"
    @request = PaymentRequest.new(id: SecureRandom.uuid, amount: 100, public_token: "test-token", status: "PENDING")
  end

  teardown do
    @previous_env.each { |key, value| value ? ENV[key] = value : ENV.delete(key) }
  end

  test "esewa initiation saves the provider checkout link without a second form submission" do
    response = Net::HTTPFound.new("1.1", "302", "Found")
    response["location"] = "https://rc-epay.esewa.com.np/epay?bookingId=test-session"
    with_post_form(response) do
      result = Payments::Gateway.start(@request, "ESEWA")
      assert_equal response["location"], result[:url]
      assert_equal @request.id, result[:reference]
      assert_not result.key?(:fields)
      @request.assign_attributes(gateway: "ESEWA", status: "INITIATED", gateway_reference: result[:reference], gateway_url: result[:url])
      assert_equal result, Payments::Gateway.start(@request, "ESEWA")
    end
    assert_equal 1, @form_posts
  end

  test "esewa initiation rejects an untrusted checkout redirect" do
    response = Net::HTTPFound.new("1.1", "302", "Found")
    response["location"] = "https://example.test/epay?bookingId=bad-session"
    with_post_form(response) { assert_raises(ApiError) { Payments::Gateway.start(@request, "ESEWA") } }
  end

  test "legacy esewa initiation cannot submit the same transaction again" do
    @request.assign_attributes(gateway: "ESEWA", status: "INITIATED", gateway_reference: @request.id, gateway_url: "https://rc-epay.esewa.com.np/api/epay/main/v2/form")
    assert_not Payments::Gateway.resumable_esewa?(@request)
    with_post_form(nil) { assert_raises(ApiError) { Payments::Gateway.start(@request, "ESEWA") } }
    assert_equal 0, @form_posts
  end

  test "esewa return URLs let the provider append its data query without a second question mark" do
    fields = Payments::Gateway.esewa_form(@request).fetch(:fields)
    assert_equal "/pay/test-token/return/ESEWA/success", URI(fields[:success_url]).path
    assert_equal "/pay/test-token/return/ESEWA/cancelled", URI(fields[:failure_url]).path
    assert_nil URI(fields[:success_url]).query
    assert_nil URI(fields[:failure_url]).query
  end

  test "esewa status verification uses the documented sandbox and live hosts" do
    @request.gateway_reference = @request.id
    response = { "status" => "COMPLETE", "total_amount" => "100.0", "transaction_uuid" => @request.id, "product_code" => "EPAYTEST", "ref_id" => "test-receipt" }
    with_status_response(response) do
      { "sandbox" => "rc.esewa.com.np", "live" => "esewa.com.np" }.each do |mode, host|
        ENV["ESEWA_MODE"] = mode
        result = Payments::Gateway.verify_esewa(@request)
        assert result[:complete]
        assert_equal "test-receipt", result[:transaction_id]
        uri = URI(@status_url)
        assert_equal host, uri.host
        assert_equal "/api/epay/transaction/status/", uri.path
        assert_equal @request.id, URI.decode_www_form(uri.query).to_h["transaction_uuid"]
      end
    end
  end

  test "esewa cannot confirm a status response missing or mismatching payment identity" do
    @request.gateway_reference = @request.id
    response = { "status" => "COMPLETE", "total_amount" => "100.0", "transaction_uuid" => @request.id, "product_code" => "EPAYTEST", "ref_id" => "test-receipt" }
    [ response.except("transaction_uuid"), response.except("product_code"), response.merge("product_code" => "other-merchant"), response.merge("total_amount" => "101.0") ].each do |invalid|
      with_status_response(invalid) { assert_not Payments::Gateway.verify_esewa(@request)[:complete] }
    end
  end

  test "guest wallets require live credentials and a public HTTPS return URL" do
    ENV["FRONTEND_PUBLIC_URL"] = "https://hotel.example.test"
    assert_not_includes Payments::Gateway.public_available, :ESEWA
    ENV["ESEWA_MODE"] = "live"
    assert_includes Payments::Gateway.public_available, :ESEWA
    [ "http://hotel.example.test", "https://localhost", "https://127.0.0.1", "https://172.16.102.238", "https://192.168.1.1", "https://[::1]", "https://hotel.local", "invalid" ].each do |url|
      ENV["FRONTEND_PUBLIC_URL"] = url
      assert_empty Payments::Gateway.public_available
    end
    ENV["FRONTEND_PUBLIC_URL"] = "https://hotel.example.test"
    ENV.delete("ESEWA_SECRET_KEY")
    assert_not_includes Payments::Gateway.public_available, :ESEWA
  end

  private

  def with_status_response(response)
    original = Payments::Gateway.method(:get_json)
    test = self
    Payments::Gateway.define_singleton_method(:get_json) do |url|
      test.instance_variable_set(:@status_url, url)
      response
    end
    yield
  ensure
    Payments::Gateway.define_singleton_method(:get_json, original)
  end

  def with_post_form(response)
    original = Payments::Gateway.method(:post_form)
    @form_posts = 0
    test = self
    Payments::Gateway.define_singleton_method(:post_form) do |_uri, fields|
      test.instance_variable_set(:@form_posts, test.instance_variable_get(:@form_posts) + 1)
      test.assert_equal "100.0", fields[:total_amount]
      response
    end
    yield
  ensure
    Payments::Gateway.define_singleton_method(:post_form, original)
  end
end
