namespace :api do
  namespace :v1 do
    namespace :accounting do
      get "payroll", to: "payroll#index"
      put "payroll/configuration", to: "payroll#configure"
      patch "payroll/staff/:id", to: "payroll#salary"
      post "payroll", to: "payroll#create"
      patch "payroll/:id", to: "payroll#update"
      post "payroll/:id/approve", to: "payroll#approve"
      post "payroll/:id/advance", to: "payroll#advance"
      post "payroll/:id/pay", to: "payroll#pay"
      resources :chart_of_accounts, only: %i[index create], path: "chart-of-accounts"
      resources :journals, only: %i[index create]
      resources :reports, only: :index
    end
  end
end
