require "test_helper"

class CmsOffersTest < ActionDispatch::IntegrationTest
  setup do
    @company = Company.create!(name: "Offers Review", slug: "cms-offers-review")
    @property = @company.properties.create!(name: "Offers Hotel", code: "OFFERS-REVIEW")
    role = @company.roles.create!(name: "CMS_EDITOR", permissions: { "CMS" => %w[read create delete] })
    @editor = @company.users.create!(role: role, email: "offers-review@example.test", first_name: "CMS", last_name: "Editor", password: "Offers-Review-Test-2026!")
    @editor.user_properties.create!(property: @property)
  end

  test "empty public offers remain empty and management requires authentication" do
    get base, params: { propertyCode: @property.code }
    assert_response :success
    assert_empty response.parsed_body["offers"]
    get base, params: { scope: "manage", propertyCode: @property.code }
    assert_response :unauthorized
  end

  test "CMS editor can publish manage deactivate and remove real offers" do
    post base, params: payload, headers: headers, as: :json
    assert_response :success
    offer = CmsOffer.find(response.parsed_body.dig("offer", "id"))
    assert_equal @property.id, offer.property_id
    assert AuditLog.exists?(entity_id: offer.id, module_name: "CMS", user: @editor)
    get base, params: { propertyCode: @property.code }
    assert_equal [offer.id], response.parsed_body["offers"].pluck("id")
    post base, params: payload.merge(id: offer.id, isActive: false), headers: headers, as: :json
    assert_response :success
    get base, params: { propertyCode: @property.code }
    assert_empty response.parsed_body["offers"]
    get base, params: { scope: "manage" }, headers: headers
    assert_equal [offer.id], response.parsed_body["offers"].pluck("id")
    delete "#{base}/#{offer.id}", headers: headers
    assert_response :success
    refute CmsOffer.exists?(offer.id)
    get base, params: { propertyCode: @property.code }
    assert_empty response.parsed_body["offers"]
  end

  test "expired future and other property promotions are excluded from public offers" do
    @property.cms_offers.create!(title: "Expired", code: "OLD", valid_from: Date.current - 10, valid_until: Date.current - 1, discount_pct: 10)
    @property.cms_offers.create!(title: "Future", code: "FUTURE", valid_from: Date.current + 1, valid_until: Date.current + 10, discount_pct: 10)
    other = @company.properties.create!(name: "Other", code: "OTHER-OFFERS")
    foreign = other.cms_offers.create!(title: "Other property", code: "OTHER", valid_from: Date.current, valid_until: Date.current + 1, discount_pct: 10)
    get base, params: { propertyCode: @property.code }
    assert_empty response.parsed_body["offers"]
    get base, params: { scope: "manage" }, headers: headers
    assert_equal 2, response.parsed_body["offers"].length
    delete "#{base}/#{foreign.id}", headers: headers
    assert_response :not_found
    assert foreign.reload.persisted?
  end

  test "invalid discounts amounts and dates do not create offers or audit entries" do
    [{ discountPct: -1 }, { discountPct: 101 }, { priceStartingAt: -1 }, { validUntil: (Date.current - 1).iso8601 }].each do |invalid|
      assert_no_difference ["CmsOffer.count", "AuditLog.count"] do
        post base, params: payload.merge(invalid), headers: headers, as: :json
      end
      assert_response :unprocessable_content
    end
  end

  private

  def base = "/api/v1/cms/offers"
  def headers = { "Authorization" => "Bearer #{Authentication::Token.encode(@editor)}", "X-Property-Code" => @property.code }
  def payload = { title: "Current Offer", code: "TEST10", discountPct: 10, validFrom: Date.current.iso8601, validUntil: (Date.current + 10).iso8601, priceStartingAt: 1000, isActive: true }
end
