module Api
  module V1
    module Cms
      class MediaController < BackendController
        self.authorization_module_name = "CMS"

        def index
          assets = default_property.cms_media_assets.with_attached_file.order(created_at: :desc)
          assets = assets.where(category: CmsMediaAsset::PORTAL_CATEGORIES) if params[:scope] == "portal"
          render json: { success: true, media: assets.map { |asset| serialize(asset) } }
        end

        def create
          uploaded_file = params.require(:file)
          asset = default_property.cms_media_assets.new(
            company: default_property.company,
            title: params.require(:title),
            alt_text: params.require(:altText),
            category: params[:category].presence || "GENERAL"
          )
          asset.file.attach(uploaded_file)
          asset.save!

          audit!("CMS", "CREATE", "CmsMediaAsset", asset.id, new_values: { title: asset.title, category: asset.category })
          render json: { success: true, media: serialize(asset) }, status: :created
        end

        def destroy
          asset = default_property.cms_media_assets.find(params[:id])
          audit!("CMS", "DELETE", "CmsMediaAsset", asset.id, old_values: { title: asset.title, category: asset.category })
          asset.destroy!
          render json: { success: true }
        end

        private

        def serialize(asset)
          blob = asset.file.blob
          {
            id: asset.id,
            title: asset.title,
            alt: asset.alt_text,
            category: asset.category,
            url: rails_blob_url(blob, host: request.base_url),
            filename: blob.filename.to_s,
            contentType: blob.content_type,
            size: blob.byte_size,
            dimensions: blob.metadata.values_at("width", "height").compact.join("x").presence || "Image",
            createdAt: asset.created_at.iso8601
          }
        end
      end
    end
  end
end
