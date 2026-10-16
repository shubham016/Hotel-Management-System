require "test_helper"

class HousekeepingTest < ActionDispatch::IntegrationTest
  setup do
    @company = Company.create!(name: "Housekeeping verification", slug: "housekeeping-verification")
    @property = @company.properties.create!(name: "Service Hotel", code: "HK-VERIFY")
    Access::StaffRoles.install!(@company)
    @owner = create_user("OWNER", "owner")
    @cleaner = create_user("HOUSEKEEPING", "cleaner")
    @member = @property.staff_members.create!(name: "Assigned Cleaner", department: "Housekeeping", position: 1)
    @type = @property.room_types.create!(name: "Standard", code: "HK-STD", slug: "hk-standard", base_price: 1000, max_adults: 2, max_children: 0, max_occupancy: 2, setup_managed: true)
    @room = @property.rooms.create!(room_type: @type, room_number: "101", status: "OCCUPIED", setup_managed: true)
    guest = @company.guests.create!(first_name: "Service", last_name: "Guest", phone: "9800003321")
    @stay = @property.reservations.create!(guest:, confirmation_number: "HK-STAY", source: "WALK_IN", status: "CHECKED_IN", check_in_date: Date.current - 1,
      check_out_date: Date.current + 2, checked_in_at: 1.day.ago, adults_count: 1, children_count: 0, room_total: 3000, grand_total: 3000)
    @stay.reservation_rooms.create!(room: @room, room_type: @type, nightly_rate: 1000, nights: 3)
  end

  test "daily occupied-room service preserves occupancy reservation and finance and is replay safe" do
    before = @stay.attributes
    assert_no_difference ["JournalEntry.count", "Payment.count", "FolioItem.count"] do
      assert_difference "HousekeepingTask.count", 1 do
        update_room("SERVICE_STAYOVER", user: @cleaner)
        assert_response :success
      end
    end
    task = @room.housekeeping_tasks.sole
    assert_equal "STAYOVER", task.task_type
    assert_equal "COMPLETED", task.status
    assert_equal @cleaner.id, task.completed_by_id
    assert_equal @property.operating_date, task.service_date
    assert_equal "OCCUPIED", @room.reload.status
    assert_equal before, @stay.reload.attributes
    assert_equal "OCCUPIED", response.parsed_body.dig("data", "status")
    assert_equal "COMPLETED", response.parsed_body.dig("data", "latestTask", "status")
    assert_no_difference ["HousekeepingTask.count", "AuditLog.count"] do
      update_room("SERVICE_STAYOVER", user: @cleaner)
      assert_response :success
    end
    get "/api/v1/housekeeping/tasks", headers: headers(@cleaner)
    assert_response :success
    assert_equal false, response.parsed_body["canAssign"]
    assert_equal [], response.parsed_body["staff"]
    assert_equal task.id, response.parsed_body["rooms"].sole.dig("latestTask", "id")
    @property.update!(business_date: @property.operating_date + 1)
    get "/api/v1/housekeeping/tasks", headers: headers(@cleaner)
    assert_nil response.parsed_body["rooms"].sole["latestTask"]
    assert_difference "HousekeepingTask.count", 1 do
      update_room("SERVICE_STAYOVER", user: @cleaner)
      assert_response :success
    end
    assert task.reload.completed_at
  end

  test "manager assigns active property staff and completion retains assignee and actual operator" do
    update_room("ASSIGN", staffMemberId: @member.id)
    assert_response :success
    task = @room.housekeeping_tasks.sole
    assert_equal @member.id, task.assigned_staff_member_id
    assert_equal @member.name, response.parsed_body.dig("data", "latestTask", "assigned_to")
    update_room("SERVICE_STAYOVER", user: @cleaner)
    assert_response :success
    assert_equal @member.id, task.reload.assigned_staff_member_id
    assert_equal @member.name, task.assigned_to
    assert_equal @cleaner.id, task.completed_by_id
    assert AuditLog.exists?(entity_id: task.id, action: "ASSIGN", user: @owner)
    assert AuditLog.exists?(entity_id: task.id, action: "SERVICE_STAYOVER", user: @cleaner)
    update_room("ASSIGN", staffMemberId: @member.id)
    assert_response :conflict
    assert_equal "TASK_COMPLETED", response.parsed_body["code"]
  end

  test "assignment rejects unauthorized inactive and foreign property staff without writes" do
    other = @company.properties.create!(name: "Other Service Hotel", code: "HK-OTHER")
    foreign_staff = other.staff_members.create!(name: "Other Cleaner", department: "Housekeeping", position: 1)
    assert_no_difference ["HousekeepingTask.count", "AuditLog.count"] do
      update_room("ASSIGN", user: @cleaner, staffMemberId: @member.id)
      assert_response :forbidden
      update_room("ASSIGN", staffMemberId: foreign_staff.id)
      assert_response :not_found
      @member.update!(active: false)
      update_room("ASSIGN", staffMemberId: @member.id)
      assert_response :not_found
    end
  end

  test "vacant cleaning and inspection preserve assignments and occupied safeguards" do
    update_room("MARK_CLEAN", user: @cleaner)
    assert_response :conflict
    assert_equal "OCCUPIED", @room.reload.status
    @stay.update!(status: "CHECKED_OUT", checked_out_at: Time.current)
    @room.update!(status: "VACANT_DIRTY")
    update_room("ASSIGN", staffMemberId: @member.id)
    assert_response :success
    task = @room.housekeeping_tasks.find_by!(task_type: "CLEANING")
    update_room("MARK_INSPECTED", user: @cleaner)
    assert_response :conflict
    update_room("MARK_FOR_INSPECTION", user: @cleaner)
    assert_response :success
    assert_equal "INSPECTION_REQUIRED", @room.reload.status
    assert_equal @member.id, task.reload.assigned_staff_member_id
    assert_equal @cleaner.id, task.completed_by_id
    update_room("MARK_INSPECTED", user: @cleaner)
    assert_response :success
    assert_equal "VACANT_CLEAN", @room.reload.status
    assert_equal 0, @room.housekeeping_tasks.where(status: "PENDING").count
    assert_equal "VACANT_CLEAN", response.parsed_body.dig("data", "status")
    assert_no_difference "HousekeepingTask.count" do
      update_room("SERVICE_STAYOVER", user: @cleaner)
      assert_response :conflict
    end
  end

  test "cross-property room and unrelated department access are denied" do
    other = @company.properties.create!(name: "Other Service Hotel", code: "HK-OTHER")
    other_type = other.room_types.create!(name: "Private", code: "PRIVATE", slug: "private", base_price: 1000)
    foreign_room = other.rooms.create!(room_type: other_type, room_number: "201", setup_managed: true)
    post "/api/v1/housekeeping/tasks", params: { roomId: foreign_room.id, action: "SERVICE_STAYOVER" }, headers: headers(@cleaner), as: :json
    assert_response :not_found
    cook = create_user("KITCHEN", "cook")
    update_room("SERVICE_STAYOVER", user: cook)
    assert_response :forbidden
  end

  private

  def create_user(role, name)
    user = @company.users.create!(role: @company.roles.find_by!(name: role), email: "hk-#{name}@example.test", password: "Housekeeping-Test-2026!", first_name: name.titleize, last_name: "Reviewer")
    UserProperty.create!(user:, property: @property)
    user
  end

  def headers(user)
    { "Authorization" => "Bearer #{Authentication::Token.encode(user)}", "X-Property-Code" => @property.code }
  end

  def update_room(action, user: @owner, **values)
    post "/api/v1/housekeeping/tasks", params: { roomId: @room.id, action: }.merge(values), headers: headers(user), as: :json
  end
end
