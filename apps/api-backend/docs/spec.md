Backend Spec — conta-ai
This document consolidates everything defined so far for the conta-ai backend.

1. Goal
The conta-ai backend will be responsible for:

registering income and payments
controlling wallet balance
controlling credit card spending
generating recurring entries
providing aggregated data for the dashboard
keeping the solution simple, designed for personal and local use

2. Current Scope
Included in MVP
manual transactions
recurring transactions
dynamic balance calculation
logical separation between:
wallet
credit_card
fixed categories defined in the backend
structure prepared for future evolution
Out of MVP for now
authentication
multi-user
multiple bank accounts
multiple cards in real use
advanced invoice history
attachments/receipts
subcategories
bank integration

3. Main Architecture Decisions

3.1 User
There will be no users table for now.

Reason:

the system is personal
usage will be local
authentication is not a priority right now
Impact:

tables will not have user_id
future addition of users can be done via migration
3.2 Balance Source of Truth
Balance will be dynamic, calculated from transactions.

Reason:

avoids desynchronization
reduces complexity
makes the system more reliable
sufficient for small personal use volume
Conclusion:
there will be no persisted balance field.

3.3 Central Model
The system will use a single transactions table to represent:

payments
income
credit card spending
generated recurring entries
Reason:
payments and income share the same base structure.

Differentiation via fields:

type
account_type
status

3.4 Recurrence
Recurrence will be implemented with a specific rules table.

Strategy:

when the app opens, the backend checks if it has already processed recurrences for the current month
if not, it generates pending transactions for the month
Reason:

simple for local environment
no cron job needed
works well for personal use

3.5 Credit Card
The card will be handled separately from the wallet at the logical level.

MVP:

control will be done via account_type = credit_card
Future preparation:

a credit_cards table will exist, even without full integration initially

4. Main Business Rules

4.1 Transaction Types
Each transaction will have a type:

income
expense
4.2 Account Types
Each transaction will have an account_type:

wallet
credit_card
4.3 Transaction Status
Each transaction will have a status:

pending
completed
Meaning
pending: entry created but not yet confirmed
completed: entry already confirmed and valid for calculations
Examples
manual grocery purchase: completed
rent auto-generated for current month: pending
when user confirms rent: completed
4.4 Recurrence
A transaction may or may not originate from a recurring rule.

Related fields:

is_recurring
recurring_rule_id
Example
Rule:

"Netflix"
every day 10
fixed amount
expense
wallet
Result:

in the current month, the backend generates a transaction with:

is_recurring = true
status = pending
recurring_rule_id pointing to the rule
4.5 Wallet Balance Calculation
Wallet balance will be obtained dynamically based on transactions:

consider only status = completed
consider only account_type = wallet
income increases balance
expenses reduce balance

4.6 Credit Card Invoice Calculation
Card amount will be obtained dynamically based on transactions:

consider account_type = credit_card
consider transactions valid for the invoice
calculation may consider current month in MVP

4.7 Invoice Payment
When the user pays the invoice:

the backend executes a special action
this action generates a wallet outgoing transaction
For MVP:

there will be no advanced invoice history
logic can be simplified

5. Categories
Categories will be fixed in the backend and the frontend will be responsible for styling.

Chosen approach
backend defines only the values
frontend maps color, badge, icon, visual label
Current categories
house
food
transport
health
payment
receive
Note
At this moment:

no subcategories
no category CRUD

6. Backend Entities

6.1 transactions
Central table of the system.

Fields
id
description
amount
category
type
status
account_type
is_recurring
transaction_date
recurring_rule_id
created_at
updated_at
Notes
amount must be stored in cents
recurring_rule_id is optional
description replaces the need for name

6.2 recurring_rules
Table for storing recurring transaction templates.

Fields
id
description
amount
category
type
account_type
day_of_month
is_active
created_at
updated_at
Purpose
Define rules like:

rent
internet
netflix
salary

6.3 system_config
Technical table for internal backend control.

Fields
id
last_recurring_check
created_at
updated_at
Purpose
Prevent the backend from generating duplicate recurrences in the same month.

Example
app opens in March
backend sees last processing was February
generates March transactions
updates last_recurring_check

6.4 credit_cards
Table prepared for future evolution.

Fields
id
name
card_limit
closing_day
due_day
is_active
created_at
updated_at
Current situation
exists in the model's radar
does not need to be fully integrated in MVP
MVP can continue using only account_type = credit_card

7. Entity Relationships
recurring_rules -> transactions
Relationship:

one rule can generate many transactions
one transaction can have zero or one associated rule
system_config
no direct relation to other tables
internal/technical use
credit_cards
no mandatory relation in MVP
prepared for future evolution

8. Main Backend Flows

8.1 Create Manual Transaction
User creates a manual transaction.

Example:

description: Grocery store
amount: 25000
category: food
type: expense
account_type: wallet
status: completed

8.2 Create Recurring Rule
User creates a rule like:

description: Rent
amount: 120000
category: house
type: expense
account_type: wallet
day_of_month: 5

8.3 Process Recurrences
On app open:

backend checks system_config
identifies if current month was already processed
if not:
reads active recurring_rules
generates pending transactions
marks is_recurring = true
updates last_recurring_check

8.4 Confirm Pending Transaction
User confirms a generated recurring transaction.

Result:

status changes to completed
starts counting toward balance

8.5 Fetch Dashboard Summary
Backend returns aggregated data such as:

wallet balance
current credit card amount
monthly total spending

8.6 Pay Invoice
User executes invoice payment action.

Result:

backend creates an expense in the wallet
card logic can be simplified in MVP

9. API Needs (high level)
Still without detailing the final contract, but the backend will likely need routes like:

Transactions
create transaction
list transactions
filter by type
filter by month
update transaction
delete transaction
confirm pending transaction
Recurring Rules
create recurring rule
list rules
edit rule
activate/deactivate rule
delete rule
Summary
get wallet balance
get current card amount
get monthly spending
get dashboard summary view
Credit Card
pay invoice action
eventual reading of card settings
System
process recurrences on startup
query internal config if needed

10. Performance Considerations
Since the project is:

local
personal
small
dynamic calculation is totally acceptable.

Recommended good practice
Create indexes to facilitate queries by:

status
type
account_type
transaction_date

11. Future Direction
Possible items for next versions:

multiple bank accounts
multiple real cards
real relationship between transactions and credit_cards
invoice history
subcategories
authentication
cloud/sync
goals/budgets per category


12. Consolidated ER Diagram
mermaid
Copy
erDiagram
    RECURRING_RULES ||--o{ TRANSACTIONS : generates

    RECURRING_RULES {
        int id PK
        string description
        int amount
        string category
        string type
        string account_type
        int day_of_month
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    TRANSACTIONS {
        int id PK
        string description
        int amount
        string category
        string type
        string status
        string account_type
        boolean is_recurring
        date transaction_date
        int recurring_rule_id FK
        timestamp created_at
        timestamp updated_at
    }

    SYSTEM_CONFIG {
        int id PK
        string last_recurring_check
        timestamp created_at
        timestamp updated_at
    }

    CREDIT_CARDS {
        int id PK
        string name
        int card_limit
        int closing_day
        int due_day
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }


13. Current Decision State
Already decided
no users
dynamic balance
single transactions table
recurrence with recurring_rules
technical control with system_config
credit_cards on the radar
fixed categories in backend
no subcategories
no multiple accounts for now
Can still be refined later
exact route contracts
enum format in the database
final behavior of invoice payment
real integration of the credit_cards table
