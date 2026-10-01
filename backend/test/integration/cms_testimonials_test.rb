require "test_helper"

class CmsTestimonialsTest < ActionDispatch::IntegrationTest
  setup do
    company = Company.create!(name: "Feedback Test", slug: "feedback-test")
    @property = company.properties.create!(name: "Feedback Hotel", code: "FEEDBACK-TEST")
    role = company.roles.create!(name: "SUPER_ADMIN", system: true)
    user = company.users.create!(role:, email: "feedback@example.com", password: "Strong-Test-Password-2026!", first_name: "CMS", last_name: "Owner")
    UserProperty.create!(user:, property: @property)
    post "/api/v1/auth/login", params: { email: user.email, password: "Strong-Test-Password-2026!" }, as: :json
    @headers = { "Authorization" => "Bearer #{response.parsed_body.dig('data', 'token')}", "X-Property-Code" => @property.code }
    @payload = { name: "Test Guest", origin: "Kathmandu", rating: 4, comment: "Clean rooms and welcoming staff.", active: false, sortOrder: 2 }
    @public_url = "/api/v1/cms/testimonials/published?propertyCode=#{@property.code}"
  end

  test "CMS changes are persisted and only published feedback reaches the public carousel" do
    post "/api/v1/cms/testimonials", params: { testimonial: @payload }, headers: @headers, as: :json
    assert_response :created
    id = response.parsed_body.dig("testimonial", "id")
    assert_equal "Test Guest", CmsTestimonial.find(id).name

    get @public_url
    assert_response :success
    assert_empty response.parsed_body["testimonials"]

    get "/api/v1/cms/testimonials", headers: @headers
    assert_response :success
    assert_equal [ id ], response.parsed_body["testimonials"].pluck("id")

    patch "/api/v1/cms/testimonials/#{id}", params: { testimonial: { active: true, comment: "Updated guest review.", rating: 5 } }, headers: @headers, as: :json
    assert_response :success
    get @public_url
    assert_response :success
    assert_equal "Updated guest review.", response.parsed_body.dig("testimonials", 0, "comment")
    assert_equal 5, response.parsed_body.dig("testimonials", 0, "rating")

    delete "/api/v1/cms/testimonials/#{id}", headers: @headers
    assert_response :success
    get @public_url
    assert_empty response.parsed_body["testimonials"]
  end

  test "admin feedback requires authentication and cannot modify another property" do
    get "/api/v1/cms/testimonials"
    assert_response :unauthorized
    post "/api/v1/cms/testimonials", params: { testimonial: @payload }, as: :json
    assert_response :unauthorized

    other = @property.company.properties.create!(name: "Other Hotel", code: "OTHER-FEEDBACK")
    entry = other.cms_testimonials.create!(name: "Other Guest", rating: 5, comment: "Other property's review.")
    patch "/api/v1/cms/testimonials/#{entry.id}", params: { testimonial: { comment: "Wrong property" } }, headers: @headers, as: :json
    assert_response :not_found
    delete "/api/v1/cms/testimonials/#{entry.id}", headers: @headers
    assert_response :not_found
    get @public_url
    assert_empty response.parsed_body["testimonials"]
  end

  test "invalid reviews are rejected and public feedback follows display order" do
    post "/api/v1/cms/testimonials", params: { testimonial: @payload.merge(rating: 6) }, headers: @headers, as: :json
    assert_response :unprocessable_entity
    assert_empty @property.cms_testimonials
    later = @property.cms_testimonials.create!(name: "Later", comment: "Later review", sort_order: 10)
    first = @property.cms_testimonials.create!(name: "First", comment: "First review", sort_order: 1)
    get @public_url
    assert_equal [ first.id, later.id ], response.parsed_body["testimonials"].pluck("id")
  end
end
