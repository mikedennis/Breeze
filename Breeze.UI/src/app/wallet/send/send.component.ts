import { Component } from '@angular/core';
import { ApiService } from '../../shared/services/api.service';
import { GlobalService } from '../../shared/services/global.service';
import { FormGroup, FormControl, Validators, FormBuilder } from '@angular/forms';

import { NgbModal, NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';

import { TransactionBuilding } from '../../shared/classes/transaction-building';
import { TransactionSending } from '../../shared/classes/transaction-sending';

import { SendConfirmationComponent } from './send-confirmation/send-confirmation.component';

@Component({
  selector: 'send-component',
  templateUrl: './send.component.html',
  styleUrls: ['./send.component.css'],
})

export class SendComponent {
  constructor(private apiService: ApiService, private globalService: GlobalService, private modalService: NgbModal, public activeModal: NgbActiveModal, private fb: FormBuilder) {
    this.buildSendForm();
  }

  private sendForm: FormGroup;
  private responseMessage: any;
  private errorMessage: string;
  private transaction: TransactionBuilding;

  private buildSendForm(): void {
    this.sendForm = this.fb.group({
      "address": ["", Validators.required],
      "amount": ["", Validators.compose([Validators.required, Validators.pattern(/^[0-9]+(\.[0-9]{0,8})?$/)])],
      "fee": [2, Validators.required],
      "password": ["", Validators.required]
    });

    this.sendForm.valueChanges
      .subscribe(data => this.onValueChanged(data));

    this.onValueChanged();
  }

  onValueChanged(data?: any) {
    if (!this.sendForm) { return; }
    const form = this.sendForm;
    for (const field in this.formErrors) {
      this.formErrors[field] = '';
      const control = form.get(field);
      if (control && control.dirty && !control.valid) {
        const messages = this.validationMessages[field];
        for (const key in control.errors) {
          this.formErrors[field] += messages[key] + ' ';
        }
      }
    }
  }

  formErrors = {
    'address': '',
    'amount': '',
    'fee': '',
    'password': ''
  };

  validationMessages = {
    'address': {
      'required': 'An address is required.'
    },
    'amount': {
      'required': 'An amount is required.',
      'pattern': 'Enter a valid amount. Only positive numbers are allowed.'
    },
    'fee': {
      'required': 'A fee is required.'
    },
    'password': {
      'required': 'Your password is required.'
    }
  };

  private send() {
    this.transaction = new TransactionBuilding(
      this.globalService.getWalletName(),
      this.globalService.getCoinType(),
      "account 0",
      this.sendForm.get("password").value,
      this.sendForm.get("address").value,
      this.sendForm.get("amount").value,
      this.getFeeType(),
      true
    );

    this.apiService
      .buildTransaction(this.transaction)
      .subscribe(
        response => {
          if (response.status >= 200 && response.status < 400){
            this.responseMessage = response.json();
            console.log(this.responseMessage);
          }
        },
        error => {
          console.log(error);
          if (error.status === 0) {
            alert("Something went wrong while connecting to the API. Please restart the application.");
          } else if (error.status >= 400) {
            if (!error.json().errors[0]) {
              console.log(error);
            }
            else {
              alert(error.json().errors[0].message);
            }
          }
        },
        () => this.sendTransaction(this.responseMessage.hex)
      )
    ;
  };

  private getFeeType(){
    let feeValue = this.sendForm.get("fee").value;

    switch(feeValue){
      case 1:
        return "low";
      case 2:
        return "medium";
      case 3:
        return "high";
    }
  }

  private sendTransaction(hex: string) {
    let transaction = new TransactionSending(hex);
    this.apiService
      .sendTransaction(transaction)
      .subscribe(
        response => {
          if (response.status >= 200 && response.status < 400){
            this.activeModal.close("Close clicked");
          }
        },
        error => {
          console.log(error);
          if (error.status === 0) {
            alert("Something went wrong while connecting to the API. Please restart the application.");
          } else if (error.status >= 400) {
            if (!error.json().errors[0]) {
              console.log(error);
            }
            else {
              alert(error.json().errors[0].message);
            }
          }
        },
        ()=>this.openConfirmationModal()
      )
    ;
  }

  private openConfirmationModal() {
    const modalRef = this.modalService.open(SendConfirmationComponent);
    modalRef.componentInstance.transaction = this.transaction;
  }
}
