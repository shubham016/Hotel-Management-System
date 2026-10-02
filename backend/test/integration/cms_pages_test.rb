require "test_helper"

class CmsPagesTest < ActionDispatch::IntegrationTest
  setup do
    company = Company.create!(name: "CMS Pages Test", slug: "cms-pages-test")
    @property = company.properties.create!(name: "CMS Hotel", code: "CMS-PAGES-TEST")
    role = company.roles.create!(name: "SUPER_ADMIN", system: true)
    user = company.users.create!(role:, email: "cms-pages@example.com", password: "Strong-Test-Password-2026!", first_name: "CMS", last_name: "Owner")
    UserProperty.create!(user:, property: @property)
    @headers = { "Authorization" => "Bearer #{Authentication::Token.encode(user)}", "X-Property-Code" => @property.code }
  end

  test "managed page changes persist separately and public reads return the saved banner and SEO" do
    %w[home about rooms dining banquet offers contact].each do |slug|
      payload = { slug:, title: "#{slug} page", heroHeading: "#{slug} heading", heroSubheading: "#{slug} badge", heroDescription: "#{slug} description", heroImageUrl: "https://example.com/#{slug}.jpg", seoTitle: "#{slug} SEO", seoDescription: "#{slug} search description" }
      post "/api/v1/cms/pages", params: payload, headers: @headers, as: :json
      assert_response :success, response.body
      get "/api/v1/cms/pages?slug=#{slug}&propertyCode=#{@property.code}"
      assert_response :success
      payload.each { |key, value| assert_equal value, response.parsed_body["page"][key.to_s] }
    end
    assert_equal 7, @property.cms_pages.count
    get "/api/v1/cms/pages?propertyCode=#{@property.code}"
    assert_equal "offers heading", response.parsed_body.dig("pages", "offers", "heroHeading")
    assert_equal "about heading", response.parsed_body.dig("pages", "about", "heroHeading")
    post "/api/v1/cms/pages", params: { slug: "home", heroHeading: "Unauthorized update" }, as: :json
    assert_response :unauthorized
  end

  test "contact details survive reload and saving the banner does not clear them" do
    details = { receptionPhone: "+977-71-123456", mobilePhone: "+977-9800000000", email: "contact@example.com", address: "Updated hotel address", receptionHours: "Always open" }
    post "/api/v1/cms/pages", params: { slug: "contact", title: "Contact", heroHeading: "Talk to us", contactInfo: details }, headers: @headers, as: :json
    assert_response :success, response.body
    details.each { |key, value| assert_equal value, response.parsed_body.dig("page", "contactInfo", key.to_s) }
    post "/api/v1/cms/pages", params: { slug: "contact", title: "Contact", heroHeading: "New heading" }, headers: @headers, as: :json
    assert_response :success
    get "/api/v1/cms/pages?slug=contact&propertyCode=#{@property.code}"
    assert_response :success
    details.each { |key, value| assert_equal value, response.parsed_body.dig("page", "contactInfo", key.to_s) }
    assert_equal 1, @property.cms_pages.find_by!(slug: "contact").cms_sections.where(section_key: "contact_info").count
  end
end
