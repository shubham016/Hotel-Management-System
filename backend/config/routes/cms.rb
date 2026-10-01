namespace :api do
  namespace :v1 do
    namespace :cms do
      resources :pages, only: %i[index create]
      resources :offers, only: %i[index create destroy]
      resources :media, only: %i[index create destroy]
      resources :testimonials, only: %i[index create update destroy] do
        get :published, on: :collection
      end
    end
  end
end
