$(document).ready(function () {
  setInterval(() => {});
  $.ajax({
    type: "get",
    url: "/bitcoin/balance",
    data: "data",
    dataType: "json",
    success: function (response) {
      // console.log(response);
      const { balance, final_balance, address } = response[0];

      const btc_balance = (balance + response[2][0].balance) / 100000000;
      // console.log(response);
      $(".balance").html(btc_balance + "BTC");
      $(".convert").html(btc_balance / response[3] + "USD");
      $(".address").html(address);
    },
  });

  $(".send").click(function () {
    if (!$(".trans-body").hasClass("show")) {
      $(".trans-body").addClass("show");
    }
  });
  $(".close-icon").click(function () {
    if ($(".trans-body").hasClass("show")) {
      $(".trans-body").removeClass("show");
    }
  });

  $(".trans_form").submit((event) => {
    event.preventDefault();
    $.ajax({
      type: "post",
      url: "/api/transaction",
      data: {
        outgoing_address: $(".wallet_address").val(),
        usd_amount: $(".usd_amount").val(),
        btc_amount: $(".btc_amount").val(),
        type: "send",
      },
      dataType: "json",
      success: function (response) {
        if (response) {
          $(".message").html(`
                        <div class="alert alert-${response.alert}">${response.message}</div>
                    `);
        }
      },
    });
  });

  $.ajax({
    type: "get",
    url: "/transaction/all",
    data: "data",
    dataType: "json",
    success: function (response) {
      // console.log(response);
      let [transaction, address] = response;

      for (transaction of transaction) {
        const { amount_to_receiver, date, receiver, sender, type, price } =
          transaction;
        const dates = new Date(date);
        if (transaction.sender === address) {
          $(".table-body").append(
            `
                   <tr>
                   <td>${amount_to_receiver}</td>
                   <td>${amount_to_receiver * price}</td>
                   <td>${dates.toLocaleDateString()}</td>
                   <td>${receiver}</td>
                   <td>${type}</td>

                   </tr>
                   
                   
                   `
          );
        } else {
          $(".table-body").append(
            `
                   <tr>
                   <td>${amount_to_receiver}</td>
                   <td>${amount_to_receiver * price}</td>
                   <td>${dates.toLocaleDateString()}</td>
                   <td>${receiver}</td>
                   <td>recieve</td>

                   </tr>
                   
                   
                   `
          );
        }
      }
    },
  });

  $.ajax({
    type: "get",
    url: "/transaction/barcode",
    data: "data",
    dataType: "json",
    success: function (response) {
      $(".image").html(`<img src="${response.image}" class="qrcode">`);
    },
  });

  $(".fa-clone").click(function () {
    navigator.clipboard.writeText($(".address").text());
    $(".copy_alert").removeClass("d-none");
    setTimeout(function () {
      $(".copy_alert").addClass("d-none");
    }, 3000);
  });

  $(".recieve_btn").click(function () {
    // console.log("dhjdhjhfjdhfjh");
    $(".receive_box").toggleClass("d-none");
  });
  $("#close").click(function () {
    $(".receive_box").addClass("d-none");
  });

  $(".fa-bars").click(function () {
    $(".nav-mobile").toggleClass("d-none");
    $(".nav-mobile").addClass("slide-bottom");
  });
});
