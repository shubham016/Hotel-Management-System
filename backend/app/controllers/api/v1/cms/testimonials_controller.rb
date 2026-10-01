module Api
  module V1
    module Cms
      class TestimonialsController < BackendController
        self.authorization_module_name = "CMS"
        skip_before_action :authenticate!, only: :published
        skip_before_action :authorize_request!, only: :published

        def index
          render json: { success: true, testimonials: default_property.cms_testimonials.ordered.map { |entry| serialize(entry) } }
        end

        def published
          render json: { success: true, testimonials: public_property.cms_testimonials.where(active: true).ordered.map { |entry| serialize(entry) } }
        end

        def create
          entry = default_property.cms_testimonials.new(testimonial_params)
          CmsTestimonial.transaction do
            entry.save!
            audit!("CMS", "CREATE", "CmsTestimonial", entry.id, new_values: entry.attributes)
          end
          render json: { success: true, testimonial: serialize(entry) }, status: :created
        end

        def update
          entry = default_property.cms_testimonials.find(params[:id])
          CmsTestimonial.transaction do
            old_values = entry.attributes
            entry.update!(testimonial_params)
            audit!("CMS", "UPDATE", "CmsTestimonial", entry.id, old_values:, new_values: entry.attributes)
          end
          render json: { success: true, testimonial: serialize(entry) }
        end

        def destroy
          entry = default_property.cms_testimonials.find(params[:id])
          CmsTestimonial.transaction do
            entry.destroy!
            audit!("CMS", "DELETE", "CmsTestimonial", entry.id, old_values: entry.attributes)
          end
          render json: { success: true }
        end

        private

        def testimonial_params
          params.require(:testimonial).permit(:name, :origin, :rating, :comment, :avatar, :active, :sortOrder)
            .to_h.transform_keys { |key| key == "sortOrder" ? "sort_order" : key }
        end

        def serialize(entry)
          entry.as_json(only: %i[id name origin rating comment avatar active]).merge("sortOrder" => entry.sort_order)
        end
      end
    end
  end
end
