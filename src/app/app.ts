import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Home } from './home/home';
import { Header } from './header/header';
import { Hero } from './hero/hero';

@Component({
  imports: [RouterOutlet, Home, Header, Hero],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  protected readonly title = signal('portfolio-acs');
}
