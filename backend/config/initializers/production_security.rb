if Rails.env.production?
  required_env = %w[
    JWT_SECRET_KEY
    FRONTEND_ORIGINS
    DEFAULT_PROPERTY_CODE
    RAILS_MASTER_KEY
  ]

  missing = required_env.select { |key| ENV[key].blank? }
  raise "Missing required production environment variables: #{missing.join(', ')}" if missing.any?

  if ENV["FRONTEND_ORIGINS"].split(",").any? { |origin| origin.strip == "*" }
    raise "FRONTEND_ORIGINS cannot contain wildcard origins in production"
  end

  if ENV["JWT_SECRET_KEY"].length < 48
    raise "JWT_SECRET_KEY must be at least 48 characters in production"
  end
end
