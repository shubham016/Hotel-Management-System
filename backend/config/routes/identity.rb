namespace :api do
  namespace :v1 do
    post "auth/login", to: "identity/sessions#login"
    post "auth/refresh", to: "identity/sessions#refresh"
    post "auth/logout", to: "identity/sessions#logout"
    post "auth/password", to: "identity/passwords#create"
    patch "auth/password", to: "identity/passwords#update"
    get "auth/me", to: "identity/sessions#me"
    resources :users, only: %i[index create update], controller: "identity/users"
    patch "auth/profile", to: "identity/profiles#update"
  end
end
