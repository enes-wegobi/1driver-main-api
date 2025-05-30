import { DriverStatusService } from './redis/services/driver-status.service';
import { DriverAvailabilityStatus } from './websocket/dto/driver-location.dto';

export class DriverStatusTest {
  constructor(private driverStatusService: DriverStatusService) {}

  async testDriverStatusFlow() {
    const testDriverId = 'test-driver-123';
    
    console.log('=== Driver Status Management Test ===');
    
    // 1. Driver connects and becomes available
    console.log('1. Driver connects...');
    await this.driverStatusService.markDriverAsConnected(testDriverId);
    await this.driverStatusService.updateDriverAvailability(testDriverId, DriverAvailabilityStatus.AVAILABLE);
    
    let isActive = await this.driverStatusService.isDriverActive(testDriverId);
    let availability = await this.driverStatusService.getDriverAvailability(testDriverId);
    let canAssign = await this.driverStatusService.canAssignTripToDriver(testDriverId);
    
    console.log(`   - Is Active: ${isActive}`);
    console.log(`   - Availability: ${availability}`);
    console.log(`   - Can Assign Trip: ${canAssign}`);
    
    // 2. Driver disconnects (app goes to background)
    console.log('\n2. Driver disconnects (app backgrounded)...');
    await this.driverStatusService.markDriverAsDisconnected(testDriverId);
    
    isActive = await this.driverStatusService.isDriverActive(testDriverId);
    availability = await this.driverStatusService.getDriverAvailability(testDriverId);
    canAssign = await this.driverStatusService.canAssignTripToDriver(testDriverId);
    
    console.log(`   - Is Active: ${isActive}`);
    console.log(`   - Availability: ${availability} (should remain AVAILABLE)`);
    console.log(`   - Can Assign Trip: ${canAssign} (should be false due to inactivity)`);
    
    // 3. Driver reconnects
    console.log('\n3. Driver reconnects...');
    await this.driverStatusService.markDriverAsConnected(testDriverId);
    
    isActive = await this.driverStatusService.isDriverActive(testDriverId);
    availability = await this.driverStatusService.getDriverAvailability(testDriverId);
    canAssign = await this.driverStatusService.canAssignTripToDriver(testDriverId);
    
    console.log(`   - Is Active: ${isActive}`);
    console.log(`   - Availability: ${availability} (should still be AVAILABLE)`);
    console.log(`   - Can Assign Trip: ${canAssign} (should be true again)`);
    
    // 4. Test cleanup
    console.log('\n4. Testing cleanup...');
    const availableDrivers = await this.driverStatusService.getAvailableDriversForTrip();
    console.log(`   - Available drivers for trip: ${availableDrivers.length}`);
    
    console.log('\n=== Test Complete ===');
  }
}
