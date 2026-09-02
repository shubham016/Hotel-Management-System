module Api
  module V1
    module Cms
      class PagesController < BackendController
        skip_before_action :authenticate!, only: :index
        skip_before_action :authorize_request!, only: :index

        DEFAULT_PAGES = {
          "home" => {
            title: "Home - Luxury Hospitality in Butwal",
            slug: "home",
            heroHeading: "Security, Cleanliness & Hospitality in Butwal",
            heroSubheading: "WELCOME TO HOTEL NEW ERA - BUTWAL, NEPAL (EST. 1982)",
            heroDescription: "Centrally located 5 minutes from New Bus Park near Tilottama River. 43 rooms, 3 halls, 2 restaurants, and 1 central kitchen.",
            heroImageUrl: "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1800&q=80",
            seoTitle: "Hotel New Era | Butwal, Lumbini Province, Nepal",
            seoDescription: "Rooms, dining, banquets, and hospitality in Butwal, Nepal."
          },
          "about" => { title: "About Us - Our Heritage Since 1982", slug: "about", heroHeading: "About Hotel New Era, Butwal", heroSubheading: "OVER FOUR DECADES OF EXCELLENCE", heroDescription: "Four decades of authentic Nepalese hospitality in Butwal.", heroImageUrl: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80", seoTitle: "About Us | Hotel New Era Butwal", seoDescription: "Founded in 1982, Hotel New Era provides accommodation, dining, and conference facilities." },
          "rooms" => { title: "Rooms & Suites - 43 Saleable Units", slug: "rooms", heroHeading: "Luxury Rooms & Executive Suites", heroSubheading: "COMFORT, TRANQUILITY & MODERN LUXURY IN BUTWAL", heroDescription: "Discover 43 rooms across 4 floors.", heroImageUrl: "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1800&q=80", seoTitle: "Rooms & Suites in Butwal | Hotel New Era", seoDescription: "Book well-appointed rooms in Butwal." },
          "dining" => { title: "Dining & Gastronomy", slug: "dining", heroHeading: "Culinary Heritage & Rooftop Lounge", heroSubheading: "DHIKI RESTAURANT & NEW ERA TERRACE BAR", heroDescription: "Authentic Nepali dining and rooftop lounge experiences.", heroImageUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1800&q=80", seoTitle: "Restaurants & Dining in Butwal", seoDescription: "Experience dining at Dhiki Restaurant and Terrace Lounge." },
          "banquet" => { title: "Banquets & Conferences", slug: "banquet", heroHeading: "Conferences, Weddings & Grand Events", heroSubheading: "NILKANTHA BALLROOM, TULKI DEVI HALL & DEVAKALA SUITE", heroDescription: "Event hosting with capacity up to 300 guests.", heroImageUrl: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=1800&q=80", seoTitle: "Banquet Halls & Event Venues in Butwal", seoDescription: "Host events and conferences in Butwal." },
          "offers" => { title: "Special Offers & Seasonal Packages", slug: "offers", heroHeading: "Exclusive Deals & Vacation Packages", heroSubheading: "SPECIAL EXPERIENCES & SEASONAL SAVINGS IN BUTWAL", heroDescription: "Curated room, banquet, and dining packages.", heroImageUrl: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1800&q=80", seoTitle: "Special Hotel Offers & Packages", seoDescription: "Save with Hotel New Era special packages." },
          "contact" => { title: "Contact Us & Location", slug: "contact", heroHeading: "We Are Here to Welcome You", heroSubheading: "GET IN TOUCH WITH OUR GUEST SERVICES TEAM", heroDescription: "Located on Kalikapath, Butwal, Nepal.", heroImageUrl: "https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&w=1800&q=80", seoTitle: "Contact Hotel New Era", seoDescription: "Contact Hotel New Era in Butwal." }
        }.freeze

        def index
          property = public_property
          pages = DEFAULT_PAGES.deep_dup
          property.company.cms_pages.includes(:cms_sections).find_each do |page|
            hero = page.cms_sections.find { |section| section.section_key == "hero" }
            fallback = pages[page.slug] || {}
            pages[page.slug] = {
              title: page.title,
              slug: page.slug,
              heroHeading: hero&.heading || fallback[:heroHeading] || page.title,
              heroSubheading: hero&.subheading || fallback[:heroSubheading] || "",
              heroDescription: hero&.body_text || fallback[:heroDescription] || "",
              heroImageUrl: hero&.image_url || fallback[:heroImageUrl] || "",
              seoTitle: page.meta_title || fallback[:seoTitle] || page.title,
              seoDescription: page.meta_description || fallback[:seoDescription] || ""
            }
          end

          if params[:slug].present?
            render json: { success: true, page: pages[params[:slug]] || pages["home"] }
          else
            render json: { success: true, pages: }
          end
        end

        def create
          property = default_property
          page = property.company.cms_pages.find_or_initialize_by(slug: params.require(:slug))
          page.update!(
            property:,
            title: params[:title].presence || "#{params[:slug].to_s.upcase} Page",
            meta_title: params[:seoTitle].presence || params[:title],
            meta_description: params[:seoDescription],
            og_image_url: params[:heroImageUrl],
            published: true
          )
          section = page.cms_sections.find_or_initialize_by(section_key: "hero")
          section.update!(
            heading: params[:heroHeading].presence || page.title,
            subheading: params[:heroSubheading],
            body_text: params[:heroDescription],
            image_url: params[:heroImageUrl],
            sort_order: 0,
            enabled: true
          )
          audit!("CMS", "UPDATE", "CmsPage", page.id, new_values: { slug: page.slug })
          render json: {
            success: true,
            message: "CMS Page [#{page.slug.upcase}] updated and published successfully!",
            page: {
              slug: page.slug,
              title: page.title,
              heroHeading: section.heading,
              heroSubheading: section.subheading,
              heroDescription: section.body_text,
              heroImageUrl: section.image_url,
              seoTitle: page.meta_title,
              seoDescription: page.meta_description
            }
          }
        end
      end
    end
  end
end
