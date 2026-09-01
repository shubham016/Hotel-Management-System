namespace :api do
  namespace :v1 do
    namespace :accounting do
      resources :chart_of_accounts, only: %i[index create], path: "chart-of-accounts"
      resources :journals, only: %i[index create]
      resources :reports, only: :index
    end
  end
end
