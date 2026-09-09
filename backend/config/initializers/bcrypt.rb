# Password verification should remain deliberately expensive in production.
# The local Docker environment uses a lower cost so development login is not
# slowed down by container CPU overhead.
if Rails.env.development? || Rails.env.test?
  configured_cost = ENV["BCRYPT_COST"].presence
  BCrypt::Engine.cost = configured_cost.to_i if configured_cost
end
