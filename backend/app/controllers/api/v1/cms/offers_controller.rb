module Api
  module V1
    module Cms
      class OffersController < BackendController
        skip_before_action :authenticate!, only: :index

        DEFAULT_OFFERS = [
          { id: "off-1", title: "Lumbini Pilgrimage & Spiritual Package", code: "LUMBINI15", discountPct: 15.0, validFrom: "2026-01-01", validUntil: "2026-12-31", description: "2 nights stay with breakfast and Lumbini itinerary.", bannerUrl: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80", priceStartingAt: 8500, category: "PILGRIMAGE", isActive: true },
          { id: "off-2", title: "Butwal Weekend Leisure Getaway", code: "WEEKEND20", discountPct: 20.0, validFrom: "2026-01-01", validUntil: "2026-12-31", description: "Weekend room rate with welcome drinks and late checkout.", bannerUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80", priceStartingAt: 4800, category: "LEISURE", isActive: true }
        ].freeze

        def index
          offers = public_property.cms_offers.order(created_at: :desc).map { |offer| serialize(offer) }
          render json: { success: true, offers: offers.presence || DEFAULT_OFFERS }
        end

        def create
          property = default_property
          offer = params[:id].present? && !params[:id].to_s.start_with?("off-") ? property.cms_offers.find(params[:id]) : property.cms_offers.new
          offer.update!(
            title: params.require(:title),
            code: params.require(:code).to_s.upcase.strip,
            discount_pct: params[:discountPct].presence || 15,
            valid_from: params[:validFrom].presence || Date.current,
            valid_until: params[:validUntil].presence || 90.days.from_now.to_date,
            description: params[:description],
            banner_url: params[:bannerUrl],
            active: params.fetch(:isActive, true),
            price_starting_at: params[:priceStartingAt].presence || 0,
            category: params[:category].presence || "GENERAL"
          )
          audit!("CMS", params[:id].present? ? "UPDATE" : "CREATE", "CmsOffer", offer.id, new_values: { code: offer.code })
          render json: { success: true, message: "Special offer package \"#{offer.title}\" saved successfully!", offer: serialize(offer) }
        end

        def destroy
          return render json: { success: true, message: "Sample offer dismissed" } if params[:id].to_s.start_with?("off-")

          offer = default_property.cms_offers.find(params.require(:id))
          offer.destroy!
          audit!("CMS", "DELETE", "CmsOffer", offer.id, new_values: { id: offer.id })
          render json: { success: true, message: "Special offer package deleted successfully!" }
        end

        private

        def serialize(offer)
          {
            id: offer.id,
            title: offer.title,
            code: offer.code,
            discountPct: offer.discount_pct.to_f,
            validFrom: offer.valid_from.iso8601,
            validUntil: offer.valid_until.iso8601,
            description: offer.description.to_s,
            bannerUrl: offer.banner_url,
            priceStartingAt: offer.price_starting_at.to_f,
            category: offer.category,
            isActive: offer.active
          }
        end
      end
    end
  end
end
