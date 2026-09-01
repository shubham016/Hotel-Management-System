namespace :api do
  namespace :v1 do
    namespace :crm do
      resources :guests, only: %i[index create]
    end
    resources :contact_inquiries, only: :create, path: "contact/inquiry"
    resources :audit_logs, only: :index
  end
end
