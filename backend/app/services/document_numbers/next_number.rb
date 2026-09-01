module DocumentNumbers
  class NextNumber
    PREFIXES = {
      "RESERVATION" => "RES",
      "FOLIO" => "FOL",
      "PAYMENT" => "RCP",
      "PURCHASE_ORDER" => "PO",
      "BANQUET" => "BNQ",
      "JOURNAL" => "JV"
    }.freeze

    def self.call(company:, property:, document_type:, date: Date.current)
      new(company:, property:, document_type:, date:).call
    end

    def initialize(company:, property:, document_type:, date:)
      @company = company
      @property = property
      @document_type = document_type.to_s.upcase
      @date = date
    end

    def call
      prefix = PREFIXES.fetch(@document_type)
      sequence = DocumentSequence.create_or_find_by!(
        company: @company,
        property: @property,
        document_type: @document_type,
        year: @date.year
      )

      sequence.with_lock do
        sequence.increment!(:current_value)
        "#{prefix}-#{@property.code}-#{@date.year}-#{sequence.current_value.to_s.rjust(6, '0')}"
      end
    end
  end
end
