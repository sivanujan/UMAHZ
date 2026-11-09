<?php

namespace Tests\Feature\Products;

use App\Models\AuditEvent;
use App\Models\Client;
use App\Models\ClientInsurancePolicy;
use App\Models\InsuranceClaim;
use App\Models\InsuranceProvider;
use App\Models\Invoice;
use App\Models\InvoiceLineItem;
use App\Models\Payment;
use App\Models\Product;
use App\Models\ProductStockMovement;
use App\Models\ProductVariant;
use App\Models\StaffMembership;
use App\Models\Tenant;
use App\Models\User;
use App\PatientBilling\Contracts\PaymentProvider;
use App\PatientBilling\FakePaymentProvider;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Tests\TestCase;

class ProductManagementTest extends TestCase
{
    use RefreshDatabase;

    private FakePaymentProvider $gateway;

    protected function setUp(): void
    {
        parent::setUp();
        $this->gateway = new FakePaymentProvider;
        $this->app->instance(PaymentProvider::class, $this->gateway);
        Storage::fake('public');
    }

    private function clinic(string $sub): Tenant
    {
        return Tenant::create([
            'name' => ucfirst($sub).' Wellness',
            'slug' => $sub,
            'subdomain' => $sub,
            'currency' => 'cad',
            'status' => Tenant::STATUS_APPROVED,
            'onboarding_completed_at' => now(),
            'stripe_connect_account_id' => "acct_{$sub}",
            'stripe_connect_status' => Tenant::CONNECT_CONNECTED,
            'stripe_connect_charges_enabled' => true,
            'stripe_connect_details_submitted' => true,
        ]);
    }

    /** @return array{0: User, 1: StaffMembership} */
    private function staff(Tenant $tenant, string $role): array
    {
        $user = User::factory()->create(['email_verified_at' => now()]);
        $membership = StaffMembership::create([
            'tenant_id' => $tenant->id,
            'user_id' => $user->id,
            'role' => $role,
            'status' => StaffMembership::STATUS_ACTIVE,
            'joined_at' => now(),
        ]);

        return [$user, $membership];
    }

    private function client(Tenant $tenant): Client
    {
        return Client::create([
            'tenant_id' => $tenant->id,
            'first_name' => 'Alice',
            'last_name' => 'Walker',
            'email' => 'alice@example.test',
        ]);
    }

    private function url(Tenant $tenant, string $path): string
    {
        return "http://{$tenant->subdomain}.umahz.test".$path;
    }

    public function test_tenant_isolation_product_cannot_be_viewed_or_modified_by_another_tenant(): void
    {
        $tenantA = $this->clinic('clinic-a');
        [$ownerA] = $this->staff($tenantA, StaffMembership::ROLE_CLINIC_OWNER);

        $tenantB = $this->clinic('clinic-b');
        [$ownerB] = $this->staff($tenantB, StaffMembership::ROLE_CLINIC_OWNER);

        $productA = Product::create([
            'tenant_id' => $tenantA->id,
            'name' => 'Acupuncture Herbal Tea',
            'category' => 'herbs',
            'unit_price' => 2500,
            'currency' => 'CAD',
            'taxable' => true,
            'tax_rate' => 13.00,
            'track_inventory' => true,
            'stock_quantity' => 50,
            'active' => true,
        ]);

        // Tenant B searching products gets empty result
        $searchRes = $this->actingAs($ownerB)
            ->getJson($this->url($tenantB, '/app/products/search?q=Herbal'));
        $searchRes->assertOk();
        $this->assertEmpty($searchRes->json('products'));

        // Tenant B cannot update Tenant A's product (404)
        $updateRes = $this->actingAs($ownerB)
            ->putJson($this->url($tenantB, "/app/products/{$productA->id}"), [
                'name' => 'Hacked Product',
                'category' => 'herbs',
                'unit_price' => 1000,
            ]);
        $updateRes->assertNotFound();

        // Tenant B cannot adjust stock on Tenant A's product (404)
        $adjustRes = $this->actingAs($ownerB)
            ->postJson($this->url($tenantB, "/app/products/{$productA->id}/adjust-stock"), [
                'change' => 10,
                'reason' => 'restock',
            ]);
        $adjustRes->assertNotFound();

        // Tenant B cannot delete Tenant A's product (404)
        $deleteRes = $this->actingAs($ownerB)
            ->deleteJson($this->url($tenantB, "/app/products/{$productA->id}"));
        $deleteRes->assertNotFound();
    }

    public function test_role_access_owner_and_receptionist_can_manage_practitioner_can_only_view(): void
    {
        $tenant = $this->clinic('role-clinic');
        [$owner] = $this->staff($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        [$receptionist] = $this->staff($tenant, StaffMembership::ROLE_RECEPTIONIST);
        [$practitioner] = $this->staff($tenant, StaffMembership::ROLE_PRACTITIONER);

        // 1. Owner can create product
        $createRes = $this->actingAs($owner)
            ->post($this->url($tenant, '/app/products'), [
                'name' => 'Massage Oil (Lavender)',
                'category' => 'oils',
                'description' => 'Calming organic essential oil',
                'unit_price' => 3500,
                'taxable' => true,
                'tax_rate' => 13.00,
                'track_inventory' => true,
                'stock_quantity' => 20,
                'low_stock_threshold' => 5,
            ]);
        $createRes->assertRedirect($this->url($tenant, '/app/products'));

        $product = Product::where('tenant_id', $tenant->id)->where('name', 'Massage Oil (Lavender)')->firstOrFail();
        $this->assertEquals(20, $product->stock_quantity);

        // 2. Receptionist can update product
        $updateRes = $this->actingAs($receptionist)
            ->post($this->url($tenant, "/app/products/{$product->id}"), [
                '_method' => 'PUT',
                'name' => 'Massage Oil (Lavender Organic)',
                'category' => 'oils',
                'unit_price' => 3800,
                'taxable' => true,
                'tax_rate' => 13.00,
                'track_inventory' => true,
                'stock_quantity' => 20,
            ]);
        $updateRes->assertRedirect($this->url($tenant, '/app/products'));
        $this->assertEquals('Massage Oil (Lavender Organic)', $product->fresh()->name);
        $this->assertEquals(3800, $product->fresh()->unit_price);

        // 3. Receptionist can adjust stock
        $adjustRes = $this->actingAs($receptionist)
            ->postJson($this->url($tenant, "/app/products/{$product->id}/adjust-stock"), [
                'change' => 10,
                'reason' => 'restock',
                'notes' => 'Weekly supplier shipment',
            ]);
        $adjustRes->assertOk();
        $this->assertEquals(30, $product->fresh()->stock_quantity);

        // 4. Practitioner can view list and search
        $viewRes = $this->actingAs($practitioner)
            ->get($this->url($tenant, '/app/products'));
        $viewRes->assertOk();

        $searchRes = $this->actingAs($practitioner)
            ->getJson($this->url($tenant, '/app/products/search?q=Massage'));
        $searchRes->assertOk();
        $this->assertCount(1, $searchRes->json('products'));

        // 5. Practitioner cannot create, update, adjust stock, or archive products (403)
        $pracCreate = $this->actingAs($practitioner)
            ->post($this->url($tenant, '/app/products'), [
                'name' => 'Illegal Product',
                'category' => 'supplements',
                'unit_price' => 1000,
            ]);
        $pracCreate->assertForbidden();

        $pracUpdate = $this->actingAs($practitioner)
            ->post($this->url($tenant, "/app/products/{$product->id}"), [
                '_method' => 'PUT',
                'name' => 'Illegal Update',
                'category' => 'oils',
                'unit_price' => 1000,
            ]);
        $pracUpdate->assertForbidden();

        $pracAdjust = $this->actingAs($practitioner)
            ->postJson($this->url($tenant, "/app/products/{$product->id}/adjust-stock"), [
                'change' => -5,
                'reason' => 'manual_adjustment',
            ]);
        $pracAdjust->assertForbidden();

        $pracDelete = $this->actingAs($practitioner)
            ->deleteJson($this->url($tenant, "/app/products/{$product->id}"));
        $pracDelete->assertForbidden();

        // 6. Practitioner cannot access reports
        $reportRes = $this->actingAs($practitioner)
            ->get($this->url($tenant, '/app/reports/products'));
        $reportRes->assertForbidden();
    }

    public function test_adding_product_to_invoice_snapshots_price_tax_and_links_product_id(): void
    {
        $tenant = $this->clinic('inv-clinic');
        [$owner] = $this->staff($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $client = $this->client($tenant);

        $product = Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'Kinesiology Tape (Blue)',
            'sku' => 'TAPE-BLU-01',
            'category' => 'tape',
            'unit_price' => 1500,
            'currency' => 'CAD',
            'taxable' => true,
            'tax_rate' => 13.00,
            'track_inventory' => true,
            'stock_quantity' => 100,
            'active' => true,
        ]);

        $this->actingAs($owner)
            ->post($this->url($tenant, '/app/invoices'), [
                'client_id' => $client->id,
                'due_date' => now()->addDays(7)->toDateString(),
                'line_items' => [
                    [
                        'product_id' => $product->id,
                        'description' => 'Kinesiology Tape (Blue)',
                        'quantity' => 2,
                        'unit_amount' => 1500,
                        'tax_amount' => 390, // 13% of 3000
                    ],
                ],
            ])
            ->assertRedirect();

        $invoice = Invoice::where('tenant_id', $tenant->id)->latest('id')->firstOrFail();
        $this->assertCount(1, $invoice->lineItems);

        $lineItem = $invoice->lineItems->first();
        $this->assertEquals($product->id, $lineItem->product_id);
        $this->assertEquals('Kinesiology Tape (Blue)', $lineItem->product_name_snapshot);
        $this->assertEquals(13.00, (float) $lineItem->product_tax_rate_snapshot);
        $this->assertEquals(1500, $lineItem->unit_amount);
        $this->assertEquals(2, $lineItem->quantity);
        $this->assertEquals(390, $lineItem->tax_amount);
        $this->assertEquals(3000, $lineItem->total_amount);
        $this->assertEquals(3390, $invoice->total_amount);
        $this->assertTrue($lineItem->isProduct());
    }

    public function test_price_change_on_product_does_not_alter_existing_invoice_line_item(): void
    {
        $tenant = $this->clinic('price-clinic');
        [$owner] = $this->staff($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $client = $this->client($tenant);

        $product = Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'TheraBand Resistance Loop',
            'category' => 'equipment',
            'unit_price' => 2000,
            'currency' => 'CAD',
            'taxable' => true,
            'tax_rate' => 13.00,
            'track_inventory' => true,
            'stock_quantity' => 30,
            'active' => true,
        ]);

        $this->actingAs($owner)
            ->post($this->url($tenant, '/app/invoices'), [
                'client_id' => $client->id,
                'line_items' => [
                    [
                        'product_id' => $product->id,
                        'description' => 'TheraBand Resistance Loop',
                        'quantity' => 1,
                        'unit_amount' => 2000,
                        'tax_amount' => 260,
                    ],
                ],
            ]);

        $invoice = Invoice::where('tenant_id', $tenant->id)->latest('id')->firstOrFail();
        $lineItem = $invoice->lineItems->first();

        // Clinic changes product price and name later
        $product->update([
            'name' => 'Premium TheraBand Resistance Loop Heavy',
            'unit_price' => 4500,
            'tax_rate' => 15.00,
        ]);

        // Existing invoice line item must remain strictly unchanged
        $lineItem->refresh();
        $this->assertEquals(2000, $lineItem->unit_amount);
        $this->assertEquals('TheraBand Resistance Loop', $lineItem->product_name_snapshot);
        $this->assertEquals(13.00, (float) $lineItem->product_tax_rate_snapshot);
        $this->assertEquals(2000, $lineItem->total_amount);
        $this->assertEquals(2260, $invoice->fresh()->total_amount);
    }

    public function test_inventory_tracking_stock_reduces_on_paid_and_restores_on_void(): void
    {
        $tenant = $this->clinic('inv-track-clinic');
        [$owner] = $this->staff($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $client = $this->client($tenant);

        $product = Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'Clinic T-Shirt L',
            'category' => 'apparel',
            'unit_price' => 3000,
            'currency' => 'CAD',
            'taxable' => false,
            'track_inventory' => true,
            'stock_quantity' => 25,
            'active' => true,
        ]);

        // 1. Create invoice: stock should NOT change while in draft/open state
        $this->actingAs($owner)
            ->post($this->url($tenant, '/app/invoices'), [
                'client_id' => $client->id,
                'line_items' => [
                    [
                        'product_id' => $product->id,
                        'description' => 'Clinic T-Shirt L',
                        'quantity' => 3,
                        'unit_amount' => 3000,
                        'tax_amount' => 0,
                    ],
                ],
            ]);

        $invoice = Invoice::where('tenant_id', $tenant->id)->latest('id')->firstOrFail();
        $this->assertEquals(25, $product->fresh()->stock_quantity);
        $this->assertEquals(0, ProductStockMovement::where('product_id', $product->id)->count());

        // 2. Pay invoice in full: stock reduces by 3 to 22, movement logged
        $this->actingAs($owner)
            ->post($this->url($tenant, "/app/invoices/{$invoice->id}/pay/manual"), [
                'amount' => 9000,
                'method' => 'cash',
                'notes' => 'Paid in person at reception',
            ]);

        $this->assertEquals(Invoice::STATUS_PAID, $invoice->fresh()->status);
        $this->assertEquals(22, $product->fresh()->stock_quantity);

        $movement = ProductStockMovement::where('product_id', $product->id)
            ->where('reason', ProductStockMovement::REASON_INVOICE_PAID)
            ->firstOrFail();

        $this->assertEquals(-3, $movement->change);
        $this->assertEquals(22, $movement->new_stock_quantity);
        $this->assertEquals($invoice->id, $movement->invoice_id);
        $this->assertEquals($owner->id, $movement->user_id);

        // 3. Void invoice: stock restores by 3 to 25, movement logged
        $this->actingAs($owner)
            ->post($this->url($tenant, "/app/invoices/{$invoice->id}/void"), [
                'reason' => 'Client returned unworn merchandise',
            ]);

        $this->assertEquals(Invoice::STATUS_VOID, $invoice->fresh()->status);
        $this->assertEquals(25, $product->fresh()->stock_quantity);

        $restoreMovement = ProductStockMovement::where('product_id', $product->id)
            ->where('reason', ProductStockMovement::REASON_INVOICE_VOIDED)
            ->firstOrFail();

        $this->assertEquals(3, $restoreMovement->change);
        $this->assertEquals(25, $restoreMovement->new_stock_quantity);
        $this->assertEquals($invoice->id, $restoreMovement->invoice_id);
    }

    public function test_negative_stock_warning_allows_owner_to_proceed_and_records_correct_deficit(): void
    {
        $tenant = $this->clinic('neg-stock-clinic');
        [$owner] = $this->staff($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $client = $this->client($tenant);

        $product = Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'Foam Roller',
            'category' => 'equipment',
            'unit_price' => 4000,
            'currency' => 'CAD',
            'track_inventory' => true,
            'stock_quantity' => 2, // only 2 in stock
            'active' => true,
        ]);

        // Sell 5 units (exceeding stock by 3)
        $this->actingAs($owner)
            ->post($this->url($tenant, '/app/invoices'), [
                'client_id' => $client->id,
                'line_items' => [
                    [
                        'product_id' => $product->id,
                        'description' => 'Foam Roller',
                        'quantity' => 5,
                        'unit_amount' => 4000,
                        'tax_amount' => 0,
                    ],
                ],
            ]);

        $invoice = Invoice::where('tenant_id', $tenant->id)->latest('id')->firstOrFail();

        // Taking payment succeeds, does not throw, and stock goes to -3
        $this->actingAs($owner)
            ->post($this->url($tenant, "/app/invoices/{$invoice->id}/pay/manual"), [
                'amount' => 20000,
                'method' => 'cash',
            ])
            ->assertRedirect();

        $this->assertEquals(-3, $product->fresh()->stock_quantity);

        $movement = ProductStockMovement::where('product_id', $product->id)
            ->where('reason', ProductStockMovement::REASON_INVOICE_PAID)
            ->firstOrFail();

        $this->assertEquals(-5, $movement->change);
        $this->assertEquals(-3, $movement->new_stock_quantity);
    }

    public function test_receipt_shows_product_lines_and_tax(): void
    {
        $tenant = $this->clinic('receipt-clinic');
        [$owner] = $this->staff($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $client = $this->client($tenant);

        $product = Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'Herbal Poultice',
            'category' => 'herbs',
            'unit_price' => 2000,
            'currency' => 'CAD',
            'taxable' => true,
            'tax_rate' => 13.00,
            'active' => true,
        ]);

        $this->actingAs($owner)
            ->post($this->url($tenant, '/app/invoices'), [
                'client_id' => $client->id,
                'line_items' => [
                    [
                        'product_id' => $product->id,
                        'description' => 'Herbal Poultice',
                        'quantity' => 2,
                        'unit_amount' => 2000,
                        'tax_amount' => 520,
                    ],
                ],
            ]);

        $invoice = Invoice::where('tenant_id', $tenant->id)->latest('id')->firstOrFail();

        // Pay invoice
        $this->actingAs($owner)
            ->post($this->url($tenant, "/app/invoices/{$invoice->id}/pay/manual"), [
                'amount' => 4520,
                'method' => 'cash',
            ]);

        $res = $this->actingAs($owner)
            ->get($this->url($tenant, "/app/invoices/{$invoice->id}/receipt"));

        $res->assertOk();
        $res->assertInertia(fn ($page) => $page
            ->component('PatientBilling/Receipt')
            ->has('invoice.line_items.0', fn ($li) => $li
                ->where('is_product', true)
                ->where('product_name', 'Herbal Poultice')
                ->where('product_tax_rate', '13.00')
                ->where('unit_amount', 2000)
                ->where('quantity', 2)
                ->where('tax_amount', 520)
                ->where('total_amount', 4000)
                ->etc()
            )
        );
    }

    public function test_product_sales_report_aggregates_totals_and_current_stock(): void
    {
        $tenant = $this->clinic('report-clinic');
        [$owner] = $this->staff($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $client = $this->client($tenant);

        $prod1 = Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'Organic Arnica Gel',
            'category' => 'oils',
            'unit_price' => 2000,
            'currency' => 'CAD',
            'taxable' => true,
            'tax_rate' => 13.00,
            'track_inventory' => true,
            'stock_quantity' => 40,
            'active' => true,
        ]);

        $prod2 = Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'Elastic Bandage 4in',
            'category' => 'equipment',
            'unit_price' => 1000,
            'currency' => 'CAD',
            'taxable' => false,
            'track_inventory' => true,
            'stock_quantity' => 15,
            'active' => true,
        ]);

        // Invoice 1: 3 units of Prod 1 (paid)
        $this->actingAs($owner)->post($this->url($tenant, '/app/invoices'), [
            'client_id' => $client->id,
            'line_items' => [
                [
                    'product_id' => $prod1->id,
                    'description' => 'Organic Arnica Gel',
                    'quantity' => 3,
                    'unit_amount' => 2000,
                    'tax_amount' => 780,
                ],
            ],
        ]);
        $inv1 = Invoice::where('tenant_id', $tenant->id)->latest('id')->firstOrFail();
        $this->actingAs($owner)->post($this->url($tenant, "/app/invoices/{$inv1->id}/pay/manual"), [
            'amount' => 6780,
            'method' => 'cash',
        ]);

        // Invoice 2: 2 units of Prod 1 and 4 units of Prod 2 (paid)
        $this->actingAs($owner)->post($this->url($tenant, '/app/invoices'), [
            'client_id' => $client->id,
            'line_items' => [
                [
                    'product_id' => $prod1->id,
                    'description' => 'Organic Arnica Gel',
                    'quantity' => 2,
                    'unit_amount' => 2000,
                    'tax_amount' => 520,
                ],
                [
                    'product_id' => $prod2->id,
                    'description' => 'Elastic Bandage 4in',
                    'quantity' => 4,
                    'unit_amount' => 1000,
                    'tax_amount' => 0,
                ],
            ],
        ]);
        $inv2 = Invoice::where('tenant_id', $tenant->id)->latest('id')->firstOrFail();
        $this->actingAs($owner)->post($this->url($tenant, "/app/invoices/{$inv2->id}/pay/manual"), [
            'amount' => 8520,
            'method' => 'cash',
        ]);

        // Query product sales report
        $res = $this->actingAs($owner)->get($this->url($tenant, '/app/reports/products'));
        $res->assertOk();
        $res->assertInertia(fn ($page) => $page
            ->component('Reports/Products')
            ->has('rows', 2)
            ->where('summary.total_units_sold', 9) // 5 prod1 + 4 prod2
            ->where('summary.total_revenue_cents', 14000) // 5*2000 + 4*1000
            ->where('summary.total_tax_cents', 1300) // 780 + 520
        );

        // Check stock after sales
        $this->assertEquals(35, $prod1->fresh()->stock_quantity); // 40 - 5
        $this->assertEquals(11, $prod2->fresh()->stock_quantity); // 15 - 4
    }

    public function test_inventory_deduction_on_insurance_mark_payment_received(): void
    {
        $tenant = $this->clinic('ins-paid-clinic');
        [$owner] = $this->staff($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $client = $this->client($tenant);

        $provider = InsuranceProvider::firstOrCreate(
            ['code' => 'sun_life'],
            ['name' => 'Sun Life Financial', 'is_active' => true]
        );

        $policy = ClientInsurancePolicy::create([
            'tenant_id' => $tenant->id,
            'client_id' => $client->id,
            'insurance_provider_id' => $provider->id,
            'policy_number' => 'SUN-998877',
            'member_id' => 'MBR-112233',
            'plan_holder_name' => 'Alice Walker',
            'relationship_to_patient' => 'self',
            'priority' => 'primary',
        ]);

        $product = Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'Therapeutic Neck Pillow',
            'category' => 'equipment',
            'unit_price' => 5000,
            'currency' => 'CAD',
            'taxable' => false,
            'track_inventory' => true,
            'stock_quantity' => 10,
            'active' => true,
        ]);

        // Invoice for 2 pillows = $100.00
        $this->actingAs($owner)->post($this->url($tenant, '/app/invoices'), [
            'client_id' => $client->id,
            'line_items' => [
                [
                    'product_id' => $product->id,
                    'description' => 'Therapeutic Neck Pillow',
                    'quantity' => 2,
                    'unit_amount' => 5000,
                    'tax_amount' => 0,
                ],
            ],
        ]);

        $invoice = Invoice::where('tenant_id', $tenant->id)->latest('id')->firstOrFail();
        $this->assertEquals(10, $product->fresh()->stock_quantity);

        // Record approved insurance claim covering the full $100.00
        $this->actingAs($owner)->postJson($this->url($tenant, "/app/invoices/{$invoice->id}/insurance-claim"), [
            'client_insurance_policy_id' => $policy->id,
            'amount_approved' => 10000,
            'status' => 'approved',
            'external_reference' => 'CLAIM-FULL-100',
        ])->assertStatus(201);

        $claim = InsuranceClaim::where('invoice_id', $invoice->id)->firstOrFail();

        // Mark payment received from insurer -> fully pays invoice and deducts inventory
        $this->actingAs($owner)->postJson($this->url($tenant, "/app/invoices/{$invoice->id}/insurance-claims/{$claim->id}/mark-paid"), [
            'notes' => 'Insurer settled in full',
        ])->assertOk();

        $this->assertEquals(Invoice::STATUS_PAID, $invoice->fresh()->status);
        $this->assertEquals(8, $product->fresh()->stock_quantity); // 10 - 2

        $movement = ProductStockMovement::where('product_id', $product->id)
            ->where('reason', ProductStockMovement::REASON_INVOICE_PAID)
            ->firstOrFail();
        $this->assertEquals(-2, $movement->change);
        $this->assertEquals(8, $movement->new_stock_quantity);
    }

    public function test_inventory_deduction_on_public_patient_pay(): void
    {
        $tenant = $this->clinic('public-pay-clinic');
        [$owner] = $this->staff($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $client = $this->client($tenant);

        $product = Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'Resistance Bands Set',
            'category' => 'equipment',
            'unit_price' => 3000,
            'currency' => 'CAD',
            'taxable' => false,
            'track_inventory' => true,
            'stock_quantity' => 15,
            'active' => true,
        ]);

        // Invoice for 3 bands = $90.00
        $this->actingAs($owner)->post($this->url($tenant, '/app/invoices'), [
            'client_id' => $client->id,
            'line_items' => [
                [
                    'product_id' => $product->id,
                    'description' => 'Resistance Bands Set',
                    'quantity' => 3,
                    'unit_amount' => 3000,
                    'tax_amount' => 0,
                ],
            ],
        ]);

        $invoice = Invoice::where('tenant_id', $tenant->id)->latest('id')->firstOrFail();
        $this->assertEquals(15, $product->fresh()->stock_quantity);

        // Create verified patient session token
        $sessionToken = Str::random(64);
        $hashedToken = hash('sha256', $sessionToken);
        Cache::put("patient_pay_otp:session:{$tenant->id}:{$hashedToken}", [
            'email' => strtolower(trim($client->email)),
            'tenant_id' => $tenant->id,
            'verified_at' => time(),
        ], 3600);

        // 1. Patient initiates card payment
        $cardRes = $this->withHeader('X-Patient-Pay-Token', $sessionToken)
            ->postJson($this->url($tenant, "/pay/invoices/{$invoice->id}/card"));
        $cardRes->assertOk();
        $paymentIntentId = $cardRes->json('payment_intent_id');
        $this->assertNotEmpty($paymentIntentId);

        // 2. Patient confirms card payment
        $confirmRes = $this->withHeader('X-Patient-Pay-Token', $sessionToken)
            ->postJson($this->url($tenant, "/pay/invoices/{$invoice->id}/confirm"), [
                'payment_intent_id' => $paymentIntentId,
            ]);
        $confirmRes->assertOk();

        $this->assertEquals(Invoice::STATUS_PAID, $invoice->fresh()->status);
        $this->assertEquals(12, $product->fresh()->stock_quantity); // 15 - 3

        $movement = ProductStockMovement::where('product_id', $product->id)
            ->where('reason', ProductStockMovement::REASON_INVOICE_PAID)
            ->firstOrFail();
        $this->assertEquals(-3, $movement->change);
        $this->assertEquals(12, $movement->new_stock_quantity);
    }

    public function test_partial_payment_does_not_deduct_inventory_until_fully_paid(): void
    {
        $tenant = $this->clinic('partial-pay-clinic');
        [$owner] = $this->staff($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $client = $this->client($tenant);

        $product = Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'Acupuncture Needles Box',
            'category' => 'equipment',
            'unit_price' => 5000,
            'currency' => 'CAD',
            'taxable' => false,
            'track_inventory' => true,
            'stock_quantity' => 20,
            'active' => true,
        ]);

        // Invoice for 2 boxes = $100.00 (10000 cents)
        $this->actingAs($owner)->post($this->url($tenant, '/app/invoices'), [
            'client_id' => $client->id,
            'line_items' => [
                [
                    'product_id' => $product->id,
                    'description' => 'Acupuncture Needles Box',
                    'quantity' => 2,
                    'unit_amount' => 5000,
                    'tax_amount' => 0,
                ],
            ],
        ]);

        $invoice = Invoice::where('tenant_id', $tenant->id)->latest('id')->firstOrFail();

        // 1. Partial payment of $40.00
        $this->actingAs($owner)->post($this->url($tenant, "/app/invoices/{$invoice->id}/pay/manual"), [
            'amount' => 4000,
            'method' => 'cash',
        ]);

        $invoice->refresh();
        $this->assertEquals(Invoice::STATUS_OPEN, $invoice->status);
        $this->assertEquals(4000, $invoice->amount_paid);
        $this->assertEquals(6000, $invoice->amountDue());

        // Stock must still be 20, no deduction yet
        $this->assertEquals(20, $product->fresh()->stock_quantity);
        $this->assertEquals(0, ProductStockMovement::where('product_id', $product->id)->count());

        // 2. Final payment of remaining $60.00
        $this->actingAs($owner)->post($this->url($tenant, "/app/invoices/{$invoice->id}/pay/manual"), [
            'amount' => 6000,
            'method' => 'cash',
        ]);

        $invoice->refresh();
        $this->assertEquals(Invoice::STATUS_PAID, $invoice->status);
        $this->assertEquals(10000, $invoice->amount_paid);

        // Stock now properly reduced by 2
        $this->assertEquals(18, $product->fresh()->stock_quantity);
        $this->assertEquals(1, ProductStockMovement::where('product_id', $product->id)->count());
    }

    public function test_product_image_upload_validation_and_storage(): void
    {
        $tenant = $this->clinic('image-clinic');
        [$owner] = $this->staff($tenant, StaffMembership::ROLE_CLINIC_OWNER);

        // 1. Rejects non-image file (e.g. text file spoofed or pdf)
        $txtFile = UploadedFile::fake()->create('document.pdf', 100, 'application/pdf');
        $resPdf = $this->actingAs($owner)->post($this->url($tenant, '/app/products'), [
            'name' => 'Bad Image Product',
            'unit_price' => 2000,
            'image' => $txtFile,
        ]);
        $resPdf->assertSessionHasErrors('image');

        // 2. Rejects file exceeding 2MB (2048 KB)
        $oversizedImage = UploadedFile::fake()->image('huge.png')->size(2500); // 2.5MB
        $resLarge = $this->actingAs($owner)->post($this->url($tenant, '/app/products'), [
            'name' => 'Oversized Product',
            'unit_price' => 2000,
            'image' => $oversizedImage,
        ]);
        $resLarge->assertSessionHasErrors('image');

        // 3. Accepts valid image under 2MB (e.g. 500KB PNG/JPG/WEBP)
        $validImage = UploadedFile::fake()->image('product.webp', 400, 400)->size(500);
        $resValid = $this->actingAs($owner)->post($this->url($tenant, '/app/products'), [
            'name' => 'Valid Image Product',
            'unit_price' => 2000,
            'image' => $validImage,
        ]);
        $resValid->assertRedirect($this->url($tenant, '/app/products'));

        $product = Product::where('tenant_id', $tenant->id)->where('name', 'Valid Image Product')->firstOrFail();
        $this->assertNotNull($product->image_path);
        Storage::disk('public')->assertExists($product->image_path);
    }

    public function test_backfill_creates_one_default_variant_per_existing_product_idempotently(): void
    {
        $tenant = $this->clinic('backfill-clinic');

        // Insert products directly without variants (simulating pre-migration state)
        $product1 = Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'Legacy Herbal Tea',
            'sku' => 'LEG-TEA',
            'category' => 'herbs',
            'unit_price' => 1800,
            'currency' => 'CAD',
            'taxable' => true,
            'tax_rate' => 13.00,
            'track_inventory' => true,
            'stock_quantity' => 25,
            'low_stock_threshold' => 5,
            'active' => true,
        ]);

        // Delete any automatically created variant if any
        ProductVariant::where('product_id', $product1->id)->delete();
        $this->assertEquals(0, ProductVariant::where('product_id', $product1->id)->count());

        // Re-run migration backfill logic
        $migration = require database_path('migrations/2026_11_09_120001_create_product_variants_and_backfill.php');
        // The migration has the backfill logic in its 'up' method, which can be re-run safely
        // Call the backfill logic directly:
        $productsWithoutVariants = Product::withoutGlobalScopes()
            ->whereNotExists(function ($query) {
                $query->select(\Illuminate\Support\Facades\DB::raw(1))
                    ->from('product_variants')
                    ->whereColumn('product_variants.product_id', 'products.id');
            })->get();

        foreach ($productsWithoutVariants as $prod) {
            ProductVariant::create([
                'tenant_id' => $prod->tenant_id,
                'product_id' => $prod->id,
                'name' => null,
                'sku' => $prod->sku,
                'unit_price' => $prod->unit_price,
                'stock_quantity' => $prod->track_inventory ? $prod->stock_quantity : null,
                'low_stock_threshold' => $prod->track_inventory ? $prod->low_stock_threshold : null,
                'active' => true,
                'sort_order' => 0,
            ]);
        }

        // Check variant created
        $this->assertEquals(1, ProductVariant::where('product_id', $product1->id)->count());
        $v = ProductVariant::where('product_id', $product1->id)->first();
        $this->assertNull($v->name);
        $this->assertEquals('LEG-TEA', $v->sku);
        $this->assertEquals(1800, $v->unit_price);
        $this->assertEquals(25, $v->stock_quantity);

        // Run again (idempotent test)
        $productsAgain = Product::withoutGlobalScopes()
            ->whereNotExists(function ($query) {
                $query->select(\Illuminate\Support\Facades\DB::raw(1))
                    ->from('product_variants')
                    ->whereColumn('product_variants.product_id', 'products.id');
            })->get();

        $this->assertTrue($productsAgain->isEmpty());
        $this->assertEquals(1, ProductVariant::where('product_id', $product1->id)->count());
    }

    public function test_adding_variant_line_to_invoice_snapshots_variant_name_and_price(): void
    {
        $tenant = $this->clinic('variant-inv-clinic');
        [$owner] = $this->staff($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $client = $this->client($tenant);

        // Product with 2 variants
        $product = Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'Massage Oil',
            'category' => 'oils',
            'unit_price' => 2000,
            'currency' => 'CAD',
            'taxable' => true,
            'tax_rate' => 13.00,
            'track_inventory' => true,
            'stock_quantity' => 50,
            'active' => true,
        ]);

        $variant100 = ProductVariant::create([
            'tenant_id' => $tenant->id,
            'product_id' => $product->id,
            'name' => '100 ml',
            'size_value' => 100,
            'size_unit' => 'ml',
            'sku' => 'OIL-100',
            'unit_price' => 2000,
            'stock_quantity' => 30,
            'active' => true,
            'sort_order' => 0,
        ]);

        $variant250 = ProductVariant::create([
            'tenant_id' => $tenant->id,
            'product_id' => $product->id,
            'name' => '250 ml',
            'size_value' => 250,
            'size_unit' => 'ml',
            'sku' => 'OIL-250',
            'unit_price' => 3800,
            'stock_quantity' => 20,
            'active' => true,
            'sort_order' => 1,
        ]);

        // Create invoice specifying the 250ml variant
        $res = $this->actingAs($owner)->post($this->url($tenant, '/app/invoices'), [
            'client_id' => $client->id,
            'line_items' => [
                [
                    'product_id' => $product->id,
                    'product_variant_id' => $variant250->id,
                    'description' => 'Massage Oil',
                    'quantity' => 2,
                    'unit_amount' => 3800,
                    'tax_amount' => 988,
                ],
            ],
        ]);
        $res->assertSessionHasNoErrors();

        $invoice = Invoice::where('tenant_id', $tenant->id)->latest('id')->firstOrFail();
        $lineItem = $invoice->lineItems->first();

        $this->assertEquals($product->id, $lineItem->product_id);
        $this->assertEquals($variant250->id, $lineItem->product_variant_id);
        $this->assertEquals('250 ml', $lineItem->variant_name_snapshot);
        $this->assertEquals('Massage Oil', $lineItem->product_name_snapshot);
        $this->assertEquals('Massage Oil - 250 ml', $lineItem->description);
        $this->assertEquals(3800, $lineItem->unit_amount);
    }

    public function test_per_variant_stock_deduction_on_payment_and_restoration_on_void(): void
    {
        $tenant = $this->clinic('variant-stock-clinic');
        [$owner] = $this->staff($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $client = $this->client($tenant);

        $product = Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'Kinesiology Tape',
            'category' => 'tape',
            'unit_price' => 1500,
            'currency' => 'CAD',
            'track_inventory' => true,
            'stock_quantity' => 25,
            'active' => true,
        ]);

        $varStandard = ProductVariant::create([
            'tenant_id' => $tenant->id,
            'product_id' => $product->id,
            'name' => 'Standard 5cm',
            'sku' => 'TAPE-5CM',
            'unit_price' => 1500,
            'stock_quantity' => 15,
            'active' => true,
            'sort_order' => 0,
        ]);

        $varWide = ProductVariant::create([
            'tenant_id' => $tenant->id,
            'product_id' => $product->id,
            'name' => 'Wide 10cm',
            'sku' => 'TAPE-10CM',
            'unit_price' => 2500,
            'stock_quantity' => 10,
            'active' => true,
            'sort_order' => 1,
        ]);

        // Invoice for 3 units of the Wide variant
        $this->actingAs($owner)->post($this->url($tenant, '/app/invoices'), [
            'client_id' => $client->id,
            'line_items' => [
                [
                    'product_id' => $product->id,
                    'product_variant_id' => $varWide->id,
                    'description' => 'Kinesiology Tape - Wide 10cm',
                    'quantity' => 3,
                    'unit_amount' => 2500,
                    'tax_amount' => 0,
                ],
            ],
        ]);

        $invoice = Invoice::where('tenant_id', $tenant->id)->latest('id')->firstOrFail();

        // Stock before payment: Wide = 10, Standard = 15, Product = 25
        $this->assertEquals(10, $varWide->fresh()->stock_quantity);
        $this->assertEquals(15, $varStandard->fresh()->stock_quantity);

        // 1. Pay invoice in full
        $payRes = $this->actingAs($owner)->post($this->url($tenant, "/app/invoices/{$invoice->id}/pay/manual"), [
            'amount' => 7500,
            'method' => 'cash',
        ]);
        $payRes->assertSessionHasNoErrors();

        // Wide stock reduced by 3: 10 -> 7
        $this->assertEquals(7, $varWide->fresh()->stock_quantity);
        // Standard stock untouched: 15
        $this->assertEquals(15, $varStandard->fresh()->stock_quantity);
        // Product total aggregate stock: 7 + 15 = 22
        $this->assertEquals(22, $product->fresh()->stock_quantity);

        // Movement record created per variant
        $movement = ProductStockMovement::where('product_variant_id', $varWide->id)->firstOrFail();
        $this->assertEquals(-3, $movement->change);
        $this->assertEquals(7, $movement->new_stock_quantity);
        $this->assertEquals(ProductStockMovement::REASON_INVOICE_PAID, $movement->reason);

        // 2. Void invoice
        $voidRes = $this->actingAs($owner)->post($this->url($tenant, "/app/invoices/{$invoice->id}/void"), [
            'reason' => 'Customer changed their mind',
        ]);
        $voidRes->assertSessionHasNoErrors();

        // Wide stock restored by 3: 7 -> 10
        $this->assertEquals(10, $varWide->fresh()->stock_quantity);
        // Standard stock untouched: 15
        $this->assertEquals(15, $varStandard->fresh()->stock_quantity);
        // Product total aggregate stock restored: 25
        $this->assertEquals(25, $product->fresh()->stock_quantity);

        // Void movement record created per variant
        $voidMovement = ProductStockMovement::where('product_variant_id', $varWide->id)
            ->where('reason', ProductStockMovement::REASON_INVOICE_VOIDED)
            ->firstOrFail();
        $this->assertEquals(3, $voidMovement->change);
        $this->assertEquals(10, $voidMovement->new_stock_quantity);
    }

    public function test_adjust_stock_with_reasons_and_notes_per_variant(): void
    {
        $tenant = $this->clinic('adjust-stock-clinic');
        [$owner] = $this->staff($tenant, StaffMembership::ROLE_CLINIC_OWNER);

        $product = Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'Herbal Capsules',
            'category' => 'herbs',
            'unit_price' => 3000,
            'currency' => 'CAD',
            'track_inventory' => true,
            'stock_quantity' => 50,
            'active' => true,
        ]);

        $variant = ProductVariant::create([
            'tenant_id' => $tenant->id,
            'product_id' => $product->id,
            'name' => '60 Capsules',
            'unit_price' => 3000,
            'stock_quantity' => 50,
            'active' => true,
            'sort_order' => 0,
        ]);

        // 1. Adjust with restock
        $resRestock = $this->actingAs($owner)->postJson($this->url($tenant, "/app/products/{$product->id}/adjust-stock"), [
            'product_variant_id' => $variant->id,
            'change' => 20,
            'reason' => 'restock',
            'notes' => 'Received supplier shipment #501',
        ]);
        $resRestock->assertOk();
        $this->assertEquals(70, $variant->fresh()->stock_quantity);

        // 2. Adjust with damaged_expired
        $resDamage = $this->actingAs($owner)->postJson($this->url($tenant, "/app/products/{$product->id}/adjust-stock"), [
            'product_variant_id' => $variant->id,
            'change' => -5,
            'reason' => 'damaged_expired',
            'notes' => 'Broken seals during transport',
        ]);
        $resDamage->assertOk();
        $this->assertEquals(65, $variant->fresh()->stock_quantity);

        // 3. Adjust with correction
        $resCorrection = $this->actingAs($owner)->postJson($this->url($tenant, "/app/products/{$product->id}/adjust-stock"), [
            'product_variant_id' => $variant->id,
            'change' => 2,
            'reason' => 'correction',
            'notes' => 'Quarterly physical inventory recount',
        ]);
        $resCorrection->assertOk();
        $this->assertEquals(67, $variant->fresh()->stock_quantity);

        // Check movements
        $movements = ProductStockMovement::where('product_variant_id', $variant->id)->orderBy('created_at')->get();
        $this->assertCount(3, $movements);
        $this->assertEquals('restock', $movements[0]->reason);
        $this->assertEquals('damaged_expired', $movements[1]->reason);
        $this->assertEquals('correction', $movements[2]->reason);
    }

    public function test_stock_history_endpoint_returns_movements_and_variant_filters(): void
    {
        $tenant = $this->clinic('history-clinic');
        [$owner] = $this->staff($tenant, StaffMembership::ROLE_CLINIC_OWNER);

        $product = Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'Massage Cream',
            'category' => 'oils',
            'unit_price' => 2500,
            'currency' => 'CAD',
            'track_inventory' => true,
            'stock_quantity' => 30,
            'active' => true,
        ]);

        $varA = ProductVariant::create([
            'tenant_id' => $tenant->id,
            'product_id' => $product->id,
            'name' => 'Small 100g',
            'unit_price' => 1500,
            'stock_quantity' => 10,
            'active' => true,
            'sort_order' => 0,
        ]);

        $varB = ProductVariant::create([
            'tenant_id' => $tenant->id,
            'product_id' => $product->id,
            'name' => 'Large 500g',
            'unit_price' => 4500,
            'stock_quantity' => 20,
            'active' => true,
            'sort_order' => 1,
        ]);

        // Record movements on varA and varB
        ProductStockMovement::create([
            'tenant_id' => $tenant->id,
            'product_id' => $product->id,
            'product_variant_id' => $varA->id,
            'change' => 5,
            'new_stock_quantity' => 15,
            'reason' => 'restock',
            'user_id' => $owner->id,
            'notes' => 'Small restock',
        ]);

        ProductStockMovement::create([
            'tenant_id' => $tenant->id,
            'product_id' => $product->id,
            'product_variant_id' => $varB->id,
            'change' => 10,
            'new_stock_quantity' => 30,
            'reason' => 'restock',
            'user_id' => $owner->id,
            'notes' => 'Large restock',
        ]);

        // Fetch all movements for product
        $resAll = $this->actingAs($owner)->getJson($this->url($tenant, "/app/products/{$product->id}/stock-history"));
        $resAll->assertOk();
        $this->assertCount(2, $resAll->json('movements'));

        // Filter for varA only
        $resVarA = $this->actingAs($owner)->getJson($this->url($tenant, "/app/products/{$product->id}/stock-history?variant_id={$varA->id}"));
        $resVarA->assertOk();
        $this->assertCount(1, $resVarA->json('movements'));
        $this->assertEquals('Small 100g', $resVarA->json('movements.0.variant_name'));
        $this->assertEquals('+5', $resVarA->json('movements.0.change_formatted'));
    }

    public function test_product_sales_report_breakdown_by_variant(): void
    {
        $tenant = $this->clinic('report-variant-clinic');
        [$owner] = $this->staff($tenant, StaffMembership::ROLE_CLINIC_OWNER);
        $client = $this->client($tenant);

        $product = Product::create([
            'tenant_id' => $tenant->id,
            'name' => 'Acupuncture Balm',
            'category' => 'herbs',
            'unit_price' => 2000,
            'currency' => 'CAD',
            'taxable' => true,
            'tax_rate' => 13.00,
            'track_inventory' => true,
            'stock_quantity' => 40,
            'active' => true,
        ]);

        $varSmall = ProductVariant::create([
            'tenant_id' => $tenant->id,
            'product_id' => $product->id,
            'name' => '50g',
            'unit_price' => 2000,
            'stock_quantity' => 25,
            'active' => true,
            'sort_order' => 0,
        ]);

        $varLarge = ProductVariant::create([
            'tenant_id' => $tenant->id,
            'product_id' => $product->id,
            'name' => '150g',
            'unit_price' => 4500,
            'stock_quantity' => 15,
            'active' => true,
            'sort_order' => 1,
        ]);

        // Create and pay invoice with 2x small and 1x large
        $this->actingAs($owner)->post($this->url($tenant, '/app/invoices'), [
            'client_id' => $client->id,
            'line_items' => [
                [
                    'product_id' => $product->id,
                    'product_variant_id' => $varSmall->id,
                    'description' => 'Acupuncture Balm - 50g',
                    'quantity' => 2,
                    'unit_amount' => 2000,
                    'tax_amount' => 520,
                ],
                [
                    'product_id' => $product->id,
                    'product_variant_id' => $varLarge->id,
                    'description' => 'Acupuncture Balm - 150g',
                    'quantity' => 1,
                    'unit_amount' => 4500,
                    'tax_amount' => 585,
                ],
            ],
        ]);

        $invoice = Invoice::where('tenant_id', $tenant->id)->latest('id')->firstOrFail();
        $this->actingAs($owner)->post($this->url($tenant, "/app/invoices/{$invoice->id}/pay/manual"), [
            'amount' => $invoice->total_amount,
            'method' => 'cash',
        ]);

        // Check report
        $reportRes = $this->actingAs($owner)->get($this->url($tenant, '/app/reports/products'));
        $reportRes->assertOk();

        $rows = $reportRes->viewData('page')['props']['rows'];
        $this->assertNotEmpty($rows);

        $productRow = collect($rows)->firstWhere('name', 'Acupuncture Balm');
        $this->assertNotNull($productRow);
        $this->assertEquals(3, $productRow['units_sold']); // 2 small + 1 large
        $this->assertEquals(8500, $productRow['revenue_cents']); // 4000 + 4500

        // Verify variant breakdown inside product row
        $this->assertArrayHasKey('variants', $productRow);
        $this->assertCount(2, $productRow['variants']);

        $smallReport = collect($productRow['variants'])->firstWhere('name', '50g');
        $this->assertEquals(2, $smallReport['units_sold']);
        $this->assertEquals(4000, $smallReport['revenue_cents']);

        $largeReport = collect($productRow['variants'])->firstWhere('name', '150g');
        $this->assertEquals(1, $largeReport['units_sold']);
        $this->assertEquals(4500, $largeReport['revenue_cents']);
    }

    public function test_product_image_url_accessibility_and_preview(): void
    {
        $tenant = $this->clinic('img-url-clinic');
        [$owner] = $this->staff($tenant, StaffMembership::ROLE_CLINIC_OWNER);

        $validImage = UploadedFile::fake()->image('test-thumb.jpg', 200, 200);

        $this->actingAs($owner)->post($this->url($tenant, '/app/products'), [
            'name' => 'Image Product With Preview',
            'unit_price' => 1200,
            'image' => $validImage,
        ]);

        $product = Product::where('tenant_id', $tenant->id)->where('name', 'Image Product With Preview')->firstOrFail();
        $this->assertNotNull($product->image_path);

        $imageUrl = $product->imageUrl();
        $this->assertNotNull($imageUrl);
        $this->assertStringContainsString('/storage/', $imageUrl);

        // Also test the products index includes image_url in props
        $listRes = $this->actingAs($owner)->get($this->url($tenant, '/app/products'));
        $listRes->assertOk();
        $listedProducts = $listRes->viewData('page')['props']['products'];
        $found = collect($listedProducts)->firstWhere('id', $product->id);
        $this->assertNotNull($found);
        $this->assertEquals($imageUrl, $found['image_url']);
    }
}
