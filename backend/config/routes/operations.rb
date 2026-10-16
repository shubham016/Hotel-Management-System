namespace :api do
  namespace :v1 do
    namespace :housekeeping do
      resources :tasks, only: %i[index create]
    end
    namespace :inventory do
      resources :items, only: %i[index create] do
        collection do
          post :catalog
          post :store
          post :reconcile
        end
      end
    end
    namespace :pos do
      resources :kitchen_orders, only: %i[index create update]
      resources :tables, only: :index
      resources :menu_items, only: :index
      resources :billing, only: :create
    end
    namespace :procurement do
      resources :invoices, only: %i[create update] do
        member do
          post :post
          post :void
          post :pay
        end
      end
      resources :orders, only: %i[index show create update] do
        collection { post :supplier }
        member do
          post :approve
          post :cancel
          post :receive
          post :reconcile_receipt
        end
      end
    end
    namespace :banquet do
      resources :bookings, only: %i[index show create update] do
        member do
          post :receipt
          post :refund
          post :settle
          post :cancel
          post :reconcile
        end
      end
    end
  end
end
