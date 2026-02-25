import { Component, signal } from '@angular/core';
import {ButtonModule} from '@ucfw/components/button';
import {CommonModule} from '@ucfw/common';
import {AlertModule} from '@ucfw/components/alert';
import {NewCalendarModule} from '@ucfw/components/new-calendar';
import {FormsModule} from '@angular/forms';
import {TreeSelectElement, TreeSelectModule} from '@ucfw/experimental/tree-select';

@Component({
  selector: 'app-root',
  imports: [ButtonModule, AlertModule, NewCalendarModule, FormsModule, TreeSelectModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected date: Date = new Date();

  protected readonly treeSelectData: TreeSelectElement<string>[] = [
    {
      type: 'select-category',
      label: 'Fruits',
      children: [
        { type: 'select-item', label: 'Apple', value: 'apple' },
        { type: 'select-item', label: 'Banana', value: 'banana' },
        { type: 'select-item', label: 'Cherry', value: 'cherry' }
      ]
    }
  ];

  protected selection = [{ type: 'select-item', label: 'Apple', value: 'apple' },];
}
