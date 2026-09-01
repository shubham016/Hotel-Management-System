class ApiRateLimiter
  WINDOW = 60
  GENERAL_LIMIT = 300
  SENSITIVE_LIMIT = 10

  def initialize(app)
    @app = app
  end

  def call(env)
    request = ActionDispatch::Request.new(env)
    return @app.call(env) unless request.path.start_with?("/api/")

    limit = sensitive_path?(request.path) ? SENSITIVE_LIMIT : GENERAL_LIMIT
    key = cache_key(request, limit)
    count = Rails.cache.increment(key, 1, expires_in: WINDOW) || 1

    return @app.call(env) if count <= limit

    [
      429,
      { "Content-Type" => "application/json", "Retry-After" => WINDOW.to_i.to_s },
      [ { success: false, error: "Too many requests", code: "RATE_LIMITED" }.to_json ]
    ]
  end

  private

  def sensitive_path?(path)
    path.match?(%r{\A/api/v1/auth/(login|refresh|password)})
  end

  def cache_key(request, limit)
    identity = request.ip.presence || "unknown"
    bucket = Time.current.to_i / WINDOW
    "rate-limit:#{limit}:#{identity}:#{request.path}:#{bucket}"
  end
end
