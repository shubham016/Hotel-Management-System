Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  # Each API business domain owns a route file in config/routes.
  draw :identity
  draw :hotel
  draw :pms
  draw :cms
  draw :crm
  draw :operations
  draw :accounting
  draw :notifications
end
