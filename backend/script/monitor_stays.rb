# Run with: bundle exec rails runner script/monitor_stays.rb
# Keeping this outside the web process also works when no browser is open.
STDOUT.sync = true
loop do
  begin
    Current.reset
    result = Reservations::AutoExtendOverdue.call
    puts "Stay monitor: #{result.inspect}" if result[:extended].positive? || result[:conflicts].positive?
    # Also reconcile rooms dirtied before this workflow was enabled.
    Room.active.setup_managed.joins(:property).where(properties: { active: true }, status: %w[VACANT_DIRTY INSPECTION_REQUIRED]).find_each do |room|
      room.with_lock { room.queue_housekeeping! }
    end
  rescue StandardError => error
    Rails.logger.error("Stay monitor failed: #{error.full_message}")
    warn "Stay monitor failed: #{error.class}: #{error.message}"
  ensure
    Current.reset
  end
  sleep 60
end
