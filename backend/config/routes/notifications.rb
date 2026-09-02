namespace :api do
  namespace :v1 do
    resources :notifications, only: %i[index update]
  end
end
