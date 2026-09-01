Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(*ENV.fetch("FRONTEND_ORIGINS", "http://localhost:3000").split(",").map(&:strip))

    resource "/api/*",
      headers: :any,
      expose: [ "X-Request-Id" ],
      methods: %i[get post put patch delete options head]
  end
end
