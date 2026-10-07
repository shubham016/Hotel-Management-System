module Api
  module V1
    module Identity
      class UsersController < BackendController
        self.authorization_module_name = "USERS"
        before_action :require_administrator!

        def index
          property = default_property
          users = Current.company.users.joins(:user_properties).where(user_properties: { property_id: property.id }).includes(:role, :staff_member).order(:first_name)
          render json: { success: true, users: users.map { |user| serialize(user) },
            staff: property.staff_members.where(active: true).order(:position).as_json(only: %i[id name department]),
            roles: Access::StaffRoles::LABELS.except("OWNER").map { |name, label| { name:, label: } } }
        end

        def create
          property = default_property
          password = params.require(:password).to_s
          validate_password!(password)
          member = property.staff_members.where(active: true).find(params.require(:staffMemberId))
          raise ApiError.new("This staff member already has a portal account", status: :conflict, code: "ACCOUNT_EXISTS") if Current.company.users.exists?(staff_member: member)
          user = User.transaction do
            account = Current.company.users.create!(role: selected_role, staff_member: member,
              email: params.require(:email), first_name: member.name.split.first,
              last_name: member.name.split.drop(1).join(" ").presence || "Staff", password:, active: true)
            account.user_properties.create!(property:)
            audit!("USERS", "CREATE", "User", account.id, new_values: { role: account.role.name, staff_member_id: member.id })
            account
          end
          render json: { success: true, data: serialize(user) }, status: :created
        end

        def update
          user = Current.company.users.joins(:user_properties).where(user_properties: { property_id: default_property.id }).find(params[:id])
          User.transaction do
            user.lock!
            if user.id == Current.user.id || user.role.name.in?(%w[OWNER SUPER_ADMIN])
              raise ApiError.new("This account is protected. Use your profile to change your own password.", status: :forbidden, code: "PROTECTED_ACCOUNT")
            end
            user.role = selected_role if params[:role].present?
            user.active = ActiveModel::Type::Boolean.new.cast(params[:active]) if params.key?(:active)
            if params[:password].present?
              validate_password!(params[:password].to_s)
              user.password = params[:password]
            end
            user.save!
            user.api_sessions.active.find_each(&:revoke!)
            audit!("USERS", "UPDATE", "User", user.id, new_values: { role: user.role.name, active: user.active })
          end
          render json: { success: true, data: serialize(user) }
        end

        private

        def require_administrator!
          unless Current.user.role.name.in?(%w[OWNER ADMIN SUPER_ADMIN])
            raise ApiError.new("Only the owner or administrator can manage portal accounts", status: :forbidden, code: "FORBIDDEN")
          end
        end

        def selected_role
          name = params.require(:role).to_s
          unless Access::StaffRoles::LABELS.key?(name) && name != "OWNER"
            raise ApiError.new("Select a staff portal role", status: :unprocessable_content, code: "INVALID_ROLE")
          end
          Current.company.roles.find_by!(name:)
        end

        def validate_password!(password)
          raise ApiError.new("Use at least 12 characters", status: :unprocessable_content, code: "WEAK_PASSWORD") if password.length < 12
        end

        def serialize(user)
          { id: user.id, name: user.full_name, email: user.email, role: user.role.name,
            roleLabel: Access::StaffRoles::LABELS[user.role.name] || user.role.name.titleize,
            active: user.active, staffMemberId: user.staff_member_id, lastLoginAt: user.last_login_at }
        end
      end
    end
  end
end
