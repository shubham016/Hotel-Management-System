class ApplicationController < ActionController::API
  rescue_from ApiError, with: :render_api_error
  rescue_from ActiveRecord::RecordNotFound, with: :render_not_found
  rescue_from ActiveRecord::RecordInvalid, with: :render_invalid_record
  rescue_from ActionController::ParameterMissing, with: :render_bad_request

  private

  def render_api_error(error)
    render_error(error.message, status: error.status, code: error.code, details: error.details)
  end

  def render_not_found
    render_error("Record not found", status: :not_found, code: "NOT_FOUND")
  end

  def render_invalid_record(error)
    render_error(
      "Validation failed",
      status: :unprocessable_content,
      code: "VALIDATION_ERROR",
      details: error.record.errors.to_hash
    )
  end

  def render_bad_request(error)
    render_error(error.message, status: :bad_request, code: "INVALID_REQUEST")
  end

  def render_error(message, status:, code:, details: nil)
    payload = { success: false, error: message, code: }
    payload[:details] = details if details.present?
    render json: payload, status:
  end
end
