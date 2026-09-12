class CmsMediaAsset < ApplicationRecord
  belongs_to :company
  belongs_to :property

  has_one_attached :file

  # Existing public-site categories remain valid so saved page images are not
  # affected. SITE_PAGE is used for new images uploaded from CMS Pages.
  CATEGORIES = %w[ADMIN_PORTAL OPERATIONS REPORTS GENERAL SITE_PAGE BRANDING HERO ROOMS DINING BANQUETS OFFERS].freeze
  PORTAL_CATEGORIES = %w[ADMIN_PORTAL OPERATIONS REPORTS GENERAL].freeze
  IMAGE_TYPES = %w[image/jpeg image/png image/webp image/gif].freeze
  MAX_FILE_SIZE = 10.megabytes

  validates :title, :alt_text, :category, presence: true
  validates :category, inclusion: { in: CATEGORIES }
  validate :file_is_an_approved_image

  private

  def file_is_an_approved_image
    return unless file.attached?

    errors.add(:file, "must be a JPG, PNG, WebP, or GIF image") unless IMAGE_TYPES.include?(file.blob.content_type)
    errors.add(:file, "must be 10 MB or smaller") if file.blob.byte_size > MAX_FILE_SIZE
  end
end
