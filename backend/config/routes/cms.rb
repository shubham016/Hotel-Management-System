namespace :api do
  namespace :v1 do
    namespace :cms do
      resources :pages, only: %i[index create]
      resources :offers, only: %i[index create destroy]
      resources :media, only: %i[index create destroy]
    end
  end
end
