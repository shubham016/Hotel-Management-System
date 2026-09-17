namespace :api do
  namespace :v1 do
    scope module: :hotel do
      get "hotel_setup", to: "hotel_setup#index"
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
