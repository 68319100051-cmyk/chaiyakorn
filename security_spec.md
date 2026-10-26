# Security Specification: FixPro Repair Shop Management

## 1. Data Invariants
- `repair_tickets`: Every ticket must have a non-empty `ticketNumber`, valid `deviceType` (computer, laptop, printer, other), a valid `customerPhone` (string <= 20 chars), valid status, and non-negative `totalAmount`.
- `inventory`: Every inventory item must have `itemCode`, non-empty `name`, positive or zero `sellingPrice`, and non-negative integer or float `stockQuantity`.
- `shop_settings`: Only authorized administrators/shop staff can update shop configuration.

## 2. The "Dirty Dozen" Threat Payloads (Must be Denied)
1. Unauthenticated write attempting to create arbitrary repair tickets.
2. Unauthenticated write attempting to overwrite or delete repair tickets.
3. Unauthenticated attempt to delete inventory records.
4. Unauthenticated attempt to list all customer phone numbers and repair histories.
5. Ticket creation with negative total amount or negative labor cost.
6. Ticket creation with missing customer contact info.
7. Injection of payload exceeding 100KB in notes or description fields.
8. Injection of malicious script tags or oversized text in ticketNumber.
9. Inventory creation with negative price.
10. Inventory deletion by non-authenticated user.
11. Update to immutable ticket creation timestamp.
12. Unauthenticated overwrite of shop settings or LINE Notify credentials.

## 3. Access Control Architecture
- **Public Customers**: Can single-read (`get`) a specific ticket by ID to check repair status via QR Code. Cannot list, create, edit, or delete any tickets or inventory.
- **Shop Staff & Admin**: Authenticated users can list, create, update, and manage repair tickets, inventory, and shop settings.
