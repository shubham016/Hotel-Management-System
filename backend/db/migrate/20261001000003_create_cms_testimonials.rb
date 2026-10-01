class CreateCmsTestimonials < ActiveRecord::Migration[8.0]
  def change
    create_table :cms_testimonials, id: :uuid do |t|
      t.references :property, type: :uuid, null: false, foreign_key: true
      t.string :name, null: false
      t.string :origin
      t.integer :rating, null: false, default: 5
      t.text :comment, null: false
      t.text :avatar
      t.boolean :active, null: false, default: true
      t.integer :sort_order, null: false, default: 0
      t.timestamps
    end
    add_check_constraint :cms_testimonials, "rating BETWEEN 1 AND 5", name: "cms_testimonials_valid_rating"
    add_check_constraint :cms_testimonials, "sort_order >= 0", name: "cms_testimonials_valid_order"

    reversible do |direction|
      direction.up do
        execute <<~SQL
          INSERT INTO cms_testimonials (property_id, name, origin, rating, comment, avatar, active, sort_order, created_at, updated_at)
          SELECT properties.id, feedback.name, feedback.origin, 5, feedback.comment, feedback.avatar, TRUE, feedback.sort_order, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          FROM properties CROSS JOIN (VALUES
            ('Pooja Bhattarai', 'Kathmandu, Nepal', 'Conveniently located 5 minutes from Butwal Bus Park on Kalikapath. Dhiki Restaurant served authentic and delicious Nepali Bhojangriha thali, and our room was spotless.', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80', 0),
            ('Santosh Sharma', 'Lumbini Transit Guest', 'Hotel New Era is the ideal base in Butwal. Quiet, clean rooms, reliable 60 Mbps fiber net, and warm attentive staff.', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80', 1),
            ('Rajesh & Suman Shrestha', 'Corporate Convention Organizer', 'Hosted our regional summit in Nilkantha Ballroom. The central kitchen catered fresh hot meals for 200 pax seamlessly.', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80', 2)
          ) AS feedback(name, origin, comment, avatar, sort_order)
          WHERE properties.code = 'HNE-BTW'
        SQL
      end
    end
  end
end
