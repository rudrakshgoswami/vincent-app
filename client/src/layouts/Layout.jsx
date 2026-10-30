import Navbar from '../components/Navbar';
import { Outlet } from 'react-router-dom';

export default function Layout() {
    return (
        <div className="min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-grow pt-20">
                <Outlet />
            </main>
            <footer className="bg-surface py-12 border-t border-border">
                <div className="container mx-auto px-6 text-center">
                    <h2 className="font-heading text-2xl mb-4 text-secondary">VINCENT</h2>
                    <p className="text-text-muted mb-4">Experience the art of coffee and conversation.</p>
                    <div className="flex justify-center gap-6 mb-8 underline-offset-8">
                        <a href="/menu" className="text-xs uppercase tracking-widest font-bold text-secondary/60 hover:text-primary transition-colors">Menu</a>
                        <a href="/venues" className="text-xs uppercase tracking-widest font-bold text-secondary/60 hover:text-primary transition-colors">Venues</a>
                        <a href="/contact" className="text-xs uppercase tracking-widest font-bold text-secondary/60 hover:text-primary transition-colors">Contact Us</a>
                        <a href="/order" className="text-xs uppercase tracking-widest font-bold text-secondary/60 hover:text-primary transition-colors">order</a>
                        <a href="/profile" className="text-xs uppercase tracking-widest font-bold text-secondary/60 hover:text-primary transition-colors">Profile</a>
                    </div>
                    <div className="text-sm text-text-muted">
                        &copy; {new Date().getFullYear()} Vincent Restaurant. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
