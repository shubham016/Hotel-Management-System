module Api
  module V1
    module Hotel
      class StaffMembersController < BackendController
        self.authorization_module_name = "ROOM_SETUP"

        def create
          member = default_property.staff_members.create!(member_params)
          audit!("ROOMS", "CREATE", "StaffMember", member.id, new_values: member.attributes.slice("name", "department", "position", "active"))
          render json: { success: true, data: serialize(member) }, status: :created
        end

        def update
          member = default_property.staff_members.find(params[:id])
          old_values = member.attributes.slice("name", "department", "position", "active")
          member.update!(member_params)
          audit!("ROOMS", "UPDATE", "StaffMember", member.id, old_values:, new_values: member.attributes.slice("name", "department", "position", "active"))
          render json: { success: true, data: serialize(member) }
        end

        def destroy
          member = default_property.staff_members.find(params[:id])
          member.update!(active: false)
          audit!("ROOMS", "DELETE", "StaffMember", member.id, old_values: { active: true }, new_values: { active: false })
          render json: { success: true, data: serialize(member) }
        end

        private

        def member_params
          params.require(:staff_member).permit(:name, :department, :position, :active)
        end

        def serialize(member)
          member.as_json(only: %i[id name department position active])
        end
      end
    end
  end
end
