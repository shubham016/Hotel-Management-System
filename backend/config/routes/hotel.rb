namespace :api do
  namespace :v1 do
    scope module: :hotel do
      resources :properties, only: %i[index show]
      resources :room_types, only: %i[index show]
      resources :rooms, only: %i[index show update]
      resources :availability, only: :index
    end
  end
end
