module Reservations
  class Search
    def self.call(scope, query)
      query = query.to_s.strip.first(200)
      return scope if query.blank?

      term = "%#{ActiveRecord::Base.sanitize_sql_like(query)}%"
      conditions = [ <<~SQL.squish ]
        reservations.confirmation_number ILIKE :term OR
        reservations.id::text ILIKE :term OR guests.id::text ILIKE :term OR
        concat_ws(' ', guests.first_name, guests.last_name) ILIKE :term OR
        guests.phone ILIKE :term OR guests.email ILIKE :term OR guests.id_number ILIKE :term OR
        EXISTS (SELECT 1 FROM folios WHERE folios.reservation_id = reservations.id AND folios.folio_number ILIKE :term) OR
        EXISTS (SELECT 1 FROM reservation_rooms rr LEFT JOIN rooms ON rooms.id = rr.room_id
          JOIN room_types ON room_types.id = rr.room_type_id WHERE rr.reservation_id = reservations.id
          AND (rooms.room_number ILIKE :term OR room_types.name ILIKE :term))
      SQL
      values = { term: }
      digits = query.gsub(/\D/, "")
      if digits.length >= 3 && query.match?(/\A[+\d\s().-]+\z/)
        conditions << "guests.normalized_phone LIKE :phone"
        values[:phone] = "%#{digits}%"
      end
      identifier = query.gsub(/[^[:alnum:]]/, "")
      if identifier.present?
        conditions << "regexp_replace(guests.id_number, :identifier_pattern, '', 'g') ILIKE :identifier"
        values[:identifier_pattern] = "[^[:alnum:]]"
        values[:identifier] = "%#{ActiveRecord::Base.sanitize_sql_like(identifier)}%"
      end
      scope.where(conditions.map { |condition| "(#{condition})" }.join(" OR "), values)
    end
  end
end
