namespace :api do
  namespace :v1 do
    scope module: :pms do
      resources :reservations, only: %i[index show create update] do
        member do
          patch :cancel
          patch :assign_room, path: "assign-room"
          patch :check_in, path: "check-in"
          patch :extend_stay, path: "extend-stay"
          patch :transfer_room, path: "transfer-room"
        end
      end
      get "pms/rooms", to: "rooms#index"
      patch "pms/rooms/:id", to: "rooms#update"
      resource :frontdesk, only: %i[show create], controller: :frontdesk
      resource :folio, only: :create, controller: :folios
      resource :checkout, only: :create, controller: :checkout
      resource :night_audit, only: %i[show create], path: "night-audit", controller: :night_audit
    end
  end
end
