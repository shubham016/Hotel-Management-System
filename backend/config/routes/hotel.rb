namespace :api do
  namespace :v1 do
    scope module: :hotel do
      get "hotel_setup", to: "hotel_setup#index"
      get "room_catalog", to: "room_catalog#index"
      get "add_on_catalog", to: "add_on_catalog#index"
      get "client_reference", to: "client_reference#index"
      get "hotel_settings", to: "hotel_settings#index"
      patch "hotel_settings", to: "hotel_settings#update"
      resources :staff_members, only: %i[create update destroy]
      resources :laundry_items, only: %i[create update destroy]
      resources :service_offerings, only: %i[create update destroy]
      resources :properties, only: %i[index show]
      resources :floors, only: %i[index create update destroy]
      resources :room_types, only: %i[index show create update destroy]
      resources :rooms, only: %i[index show create update destroy] do
        collection do
          post :bulk_create, path: "bulk"
          patch "floor/:floor", action: :update_floor, as: :update_floor
          delete "floor/:floor", action: :destroy_floor, as: :floor
        end
      end
      resources :availability, only: :index
    end
  end
end
