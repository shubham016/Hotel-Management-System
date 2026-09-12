namespace :api do
  namespace :v1 do
    scope module: :hotel do
      resources :properties, only: %i[index show]
      resources :floors, only: %i[index create update destroy]
      resources :room_types, only: %i[index show create update destroy]
      resources :rooms, only: %i[index show create update destroy]
      resources :availability, only: :index
    end
  end
end
