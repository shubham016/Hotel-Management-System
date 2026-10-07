namespace :api do
  namespace :v1 do
    namespace :housekeeping do
      resources :tasks, only: %i[index create]
    end
    namespace :inventory do
      resources :items, only: %i[index create]
    end
    namespace :pos do
      resources :kitchen_orders, only: %i[index create update]
      resources :tables, only: :index
      resources :menu_items, only: :index
      resources :billing, only: :create
    end
    namespace :procurement do
      resources :orders, only: %i[index create]
    end
    namespace :banquet do
      resources :bookings, only: %i[index create]
    end
  end
end
