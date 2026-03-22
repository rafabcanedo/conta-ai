import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/dashboard')({
    component: DashboardComponent,
})

function DashboardComponent() {
    return (
        <div className="p-8">
            <h1 className="text-2xl font-bold">My Dashboard</h1>
            <p>Here there are somethings about financess</p>
        </div>
    )
}
