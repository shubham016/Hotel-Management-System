module Api
  module V1
    module Hotel
      class ClientReferenceController < BackendController
        self.authorization_module_name = "PMS_FRONTDESK"

        STAFF = [
          ["Keshav Bhattarai", "All Round"],
          ["Devi Thapa", "Front Desk"],
          ["Madhab Pant", "Restaurant"],
          ["Himal Thapa", "Restaurant"],
          ["Samrat Thapa", "Housekeeping"],
          ["Sarita Thapa", "Housekeeping"],
          ["Bhaktisara Magar", "Housekeeping"],
          ["Kumar Bache Magar", "Kitchen Cook"],
          ["Prem Bache Magar", "Kitchen Helper"],
          ["Nisha Darlami", "Cleaning"],
          ["Baje", "Cleaning"],
          ["Punam Magar", "Dishwasher"]
        ].freeze

        LAUNDRY = [
          ["T-Shirt", 100], ["Vest", 100], ["Pants", 100], ["Shirt", 100],
          ["Jacket", 500], ["Coat", 500], ["Kurtha Set", 250],
          ["Sari Set", 500], ["Shocks", 50]
        ].freeze

        def index
          render json: {
            success: true,
            data: {
              staff: STAFF.each_with_index.map { |(name, department), index| { serial: index + 1, name:, department: } },
              laundry: LAUNDRY.map { |name, price| { name:, price: } },
              laundryCollection: "Leave bagged laundry on the table and display the Collect my laundry card by 11 a.m.",
              laundryReturn: "Clean laundry is returned by noon the next day."
            }
          }
        end
      end
    end
  end
end
